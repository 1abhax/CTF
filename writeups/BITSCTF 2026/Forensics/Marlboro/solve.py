key_hex = "c7027f5fdeb20dc7308ad4a6999a8a3e069cb5c8111d56904641cd344593b657"
key = bytes.fromhex(key_hex)

with open("encrypted.bin", "rb") as f:
    data = f.read()

decrypted = bytes([b ^ key[i % 32] for i, b in enumerate(data)])

with open("decrypted.bin", "wb") as f:
    f.write(decrypted)

print("done")