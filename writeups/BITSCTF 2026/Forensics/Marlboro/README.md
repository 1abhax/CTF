# **Marlboro**

> This write-up documents a deliberately vulnerable lab / CTF-style service.  
> All techniques are presented for educational purposes only.

---

## Overview

- **Category**: Reverce
- **Difficulty**: Easy
- **Key Concepts**: Steganography (LSB), XOR Decryption, Malbolge
- **Goal**: Recover the hidden flag from an encrypted payload concealed inside an image archive

---

## Challenge Description

> "The smoke rises, carrying secrets within... Where there's smoke, there's fire..."
>
> We intercepted an encrypted transmission from a mysterious server. The data appears to be lost, but rumor has it some ancient legend is somewhere in this image.
>
> The original sender was obsessed with a programming language from hell itself - one where code mutates, logic inverts, and sanity is optional and insanity is permanence.

Source: [SaveMeFromThisHell.zip](src/SaveMeFromThisHell.zip)

---

## Analysis

### Initial Observation

After extracting `SaveMeFromThisHell.zip`, only one file appeared: **Marlboro.jpg**.

A normal JPEG should end cleanly at its `FF D9` end-of-image marker. However, inspecting the file with `xxd` revealed a significant amount of unexpected data beyond that marker — indicating something was appended to the image.

------

### Root Cause / Weakness

The challenge relied entirely on **security through obscurity**, layering multiple concealment techniques but using no strong cryptography:

- The encrypted payload (`encrypted.bin`) was protected only by **repeating-key XOR**.
- The XOR key was **embedded directly alongside the ciphertext** inside `smoke.png` via LSB steganography.
- Once the key is recovered, XOR decryption is trivially reversible — it is its own inverse.

**Delivering the key with the ciphertext = no real security.**

------

## Key Concepts

### Polyglot File (JPEG + ZIP)

A file that is simultaneously valid under two different formats. JPEG parsers stop reading at `FF D9`; ZIP parsers look for `PK\x03\x04` headers. Appending a ZIP archive after a JPEG's end marker creates a file that opens as an image in viewers, but can also be extracted as an archive.

### LSB Steganography (PNG)

Hides secret data in the **Least Significant Bits** of pixel color channels (R, G, B). PNG is **lossless** — pixel data survives compression and transfer without alteration — making it ideal for this technique. JPEG, being **lossy**, would destroy the hidden bits during compression.

**Tool:** `zsteg` — automatically scans all bit-plane/channel combinations.

### Repeating-Key XOR

C[i]=P[i]⊕K[i mod key_len]*C*[*i*]=*P*[*i*]⊕*K*[*i*modkey_len]

P[i]=C[i]⊕K[i mod key_len]*P*[*i*]=*C*[*i*]⊕*K*[*i*modkey_len]

Since XOR is its own inverse, encryption and decryption are the same operation. Trivially broken when the key is known.

### Malbolge

An **esoteric programming language** (1998), named after the 8th circle of Hell in Dante's *Inferno*. Deliberately designed to be nearly impossible to read or write. Source code appears as dense, meaningless ASCII symbols.

------

## Exploitation / Solution

### Step 1 – Inspect the JPEG with `xxd`

```bash
xxd Marlboro.jpg | tail -n 50
```

The hex dump of the tail end of `Marlboro.jpg` reveals the critical transition point:

```yaml
00484950: 212b 23c4 6a00 0000 0049 454e 44ae 4260  !+#.j....IEND.B`
00484960: 8250 4b03 040a 0000 0000 00ab 9137 5c35  .PK..........7\5
00484970: d879 42a6 0100 00a6 0100 000d 001c 0065  .yB............e
00484980: 6e63 7279 7074 6564 2e62 696e 5554 0900  ncrypted.binUT..
```

Breaking this down:

| Offset     | Bytes                                    | Meaning                                                      |
| :--------- | :--------------------------------------- | :----------------------------------------------------------- |
| `0x484954` | `49 45 4E 44 AE 42 60 82`                | **PNG IEND chunk** — marks the end of `smoke.png` stored raw inside the ZIP |
| `0x48495C` | `50 4B 03 04`                            | **ZIP Local File Header** signature (`PK\x03\x04`) — start of the next file entry in the archive |
| `0x484970` | `0A 00` (compression method)             | `0x000A` = **Stored** (no compression), meaning file contents are embedded as-is |
| `0x48497E` | `65 6E 63 72 79 70 74 65 64 2E 62 69 6E` | Filename in ASCII: **encrypted.bin**                         |

Then starting at `0x48499C`, the raw XOR-encrypted binary data of `encrypted.bin` follows:

```
004849a0: ... 846d 112b bbdc 79ea  .........m.+..y.
004849b0: 64f3 a4c3 a3ba fe5b 7ee8 9ab0 3c70 37fc  d......[~...<p7.
  ...  (encrypted Malbolge source code)
```

At the very end of the file, the **ZIP Central Directory** appears:

```yaml
00484b40: 0931 e313 63b8 9c74 8023 011b efb8 504b  .1..c..t.#....PK
00484b50: 0102 1e03 ...                             (Central Dir entry for smoke.png)
00484b70: ... 736d 6f6b 652e 706e 67                 ...smoke.png


00484ba0: ... 504b 0102 1e03 0a00 ...               (Central Dir entry for encrypted.bin)
00484bc0: ... 656e 63727970 7465 642e 6269 6e        ...encrypted.bin


00484bf0: 504b 0506 0000 0000 0200 0200 ...         PK\x05\x06 — End of Central Directory
```

**Summary of the ZIP structure inside Marlboro.jpg:**

```scss
[JPEG data ... FF D9]
  └─ PK\x03\x04  →  smoke.png       (stored, uncompressed)
     └─ ... IEND (PNG end)
  └─ PK\x03\x04  →  encrypted.bin   (stored, uncompressed)
     └─ ... (XOR-encrypted data)
  └─ PK\x01\x02  →  Central Directory (smoke.png)
  └─ PK\x01\x02  →  Central Directory (encrypted.bin)
  └─ PK\x05\x06  →  End of Central Directory
```

The ZIP uses **no compression** (`Stored` method), so `smoke.png`'s raw PNG data — including its `IEND` marker — is visible directly in the hex dump. This is why we can see the PNG end chunk immediately followed by the next ZIP file header.

------

### Step 2 – Extract the Embedded Archive

```bash
7z x Marlboro.jpg
```

Extracted:

- `smoke.png`
- `encrypted.bin`

------

### Step 3 – Recover the XOR Key from PNG Steganography

```bash
zsteg smoke.png
```

Key findings:

```swift
meta Author          .. text: "aHR0cHM6Ly96YjMubWUvbWFsYm9sZ2UtdG9vbHMv"
b1,rgb,lsb,xy       .. text: "# Marlboro Decryption Key\n# Format: 32-byte XOR key
                               in hexadecimal\nKEY=c7027f5fdeb20dc7308ad4a6999a8a3e
                               069cb5c8111d56904641cd344593b657\n# Usage: XOR each
                               byte of encrypted.bin with key[i % 32]\n"
```

Decode the Base64 metadata:

```bash
echo aHR0cHM6Ly96YjMubWUvbWFsYm9sZ2UtdG9vbHMv | base64 -d
# → https://zb3.me/malbolge-tools/
```

This confirms the decrypted output is **Malbolge source code**.

------

### Step 4 – Decrypt `encrypted.bin`

```python
key_hex = "c7027f5fdeb20dc7308ad4a6999a8a3e069cb5c8111d56904641cd344593b657"
key = bytes.fromhex(key_hex)

with open("encrypted.bin", "rb") as f:
    data = f.read()

decrypted = bytes(b ^ key[i % 32] for i, b in enumerate(data))

with open("decrypted.mal", "wb") as f:
    f.write(decrypted)

print("Decryption complete -> decrypted.mal")
```

------

### Step 5 – Execute Malbolge to Obtain the Flag

Upload `decrypted.mal` to [zb3.me/malbolge-tools](https://zb3.me/malbolge-tools/) and run it. The output is the **flag**.

------

## Full Attack Chain

```vbnet
SaveMeFromThisHell.zip
 └── Marlboro.jpg  (polyglot: JPEG + appended ZIP)
       └── hidden ZIP (PK\x03\x04 after FF D9)
             ├── smoke.png     → zsteg → XOR key + Base64 URL
             └── encrypted.bin → XOR decrypt with key
                      ↓
                 decrypted.mal  (Malbolge source)
                      ↓
                 Execute → flag
```

------

## Key Takeaways

- **Always inspect file tails with xxd.** Data appended after `FF D9` (JPEG) or `IEND` (PNG) is a strong indicator of embedded archives or hidden payloads.
- **ZIP Stored (no compression) mode** leaves file contents readable in raw hex — this is why the PNG `IEND` chunk was visible directly in the hex dump of the JPG.
- **PNG = lossless → ideal for LSB steganography.** JPEG = lossy → destroys hidden bits. Always prioritize PNG for stego analysis.
- **Repeating-key XOR is not encryption** when the key is recoverable. It provides zero security once the key is known.
- **Unrecognizable dense ASCII output → consider esoteric languages** (Malbolge, Brainfuck, Whitespace, etc.).

------

## References

- zsteg (PNG stego scanner): <https://github.com/zed-0xff/zsteg>
- File Signatures Reference: <https://en.wikipedia.org/wiki/List_of_file_signatures>