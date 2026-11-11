"""Write source/data/santhanam-fingerprint.bloom — a fingerprint of the
Santhanam translation that can RECOGNISE a verbatim quotation of it without
CONTAINING it.

WHY. LICENSE.md promises that quotation from R. Santhanam's translation is
"kept brief and always attributed". Until now nothing checked the first half of
that promise. quotation-verify.mjs checks it: it walks every page the build
ships and reports any run of words that appears verbatim in the translation.

WHY A BLOOM FILTER AND NOT THE TEXT. This repository is public and the
translation is a copyrighted work. Committing its text, or even a list of its
sentences, to make a checker would be the very thing the checker exists to
prevent. So each run of SHINGLE consecutive words is normalised, hashed, and
set into a fixed-size bit array. The array can answer "has this exact 8-word
sequence been seen?" with a small false-positive rate, and cannot be read
backwards into text: recovering a passage would mean guessing it eight words at
a time. The harness requires a long UNBROKEN run of hits before it calls
anything a quotation, which drives the false-positive rate for a reported run
to effectively zero.

The normalisation and the hash are mirrored exactly in quotation-verify.mjs;
the harness's first check is that the two agree on a known string.

Run (needs the two project PDFs read out as text, as make-bphs-witness.py does):
    python3 source/test/make-translation-fingerprint.py VOL1.txt VOL2.txt
"""
import json, os, re, sys, unicodedata, hashlib

SHINGLE = 8                     # words per hashed sequence
M_BITS  = 1 << 21               # 2 Mi bits = 256 KiB
K       = 7                     # hash functions
HERE    = os.path.dirname(os.path.abspath(__file__))
OUT_BIN = os.path.join(HERE, "..", "data", "santhanam-fingerprint.bloom")
OUT_META = os.path.join(HERE, "..", "data", "santhanam-fingerprint.json")

def words(text):
    t = unicodedata.normalize("NFKD", text)
    t = "".join(c for c in t if unicodedata.category(c) != "Mn").lower()
    return re.findall(r"[a-z0-9]+", t)

# Two INDEPENDENTLY SEEDED hashes, each finished with MurmurHash3's fmix32.
# The first version derived h2 as FNV-1a(shingle + "#"), which is one more FNV
# step on h1's own state — so every index depended only on h1's low 21 bits,
# the filter collapsed into a 2-million-slot hash set, and its real
# false-positive rate was ~14% against a claimed 1.4%. quotation-verify.mjs now
# measures that rate empirically and fails if the two disagree.
SEED_A, SEED_B = 0x811C9DC5, 0x050C5D1F

def fnv1a(s, seed):
    h = seed
    for b in s.encode("ascii"):
        h ^= b
        h = (h * 0x01000193) & 0xFFFFFFFF
    return h

def fmix32(h):
    h ^= h >> 16; h = (h * 0x85EBCA6B) & 0xFFFFFFFF
    h ^= h >> 13; h = (h * 0xC2B2AE35) & 0xFFFFFFFF
    h ^= h >> 16
    return h

def indices(shingle):
    h1 = fmix32(fnv1a(shingle, SEED_A))
    h2 = fmix32(fnv1a(shingle, SEED_B)) | 1
    return [((h1 + i * h2) & 0xFFFFFFFF) % M_BITS for i in range(K)]

def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    bits = bytearray(M_BITS // 8)
    total_words = 0; seen = set()
    for path in sys.argv[1:3]:
        w = words(open(path, encoding="utf-8", errors="replace").read())
        total_words += len(w)
        for i in range(len(w) - SHINGLE + 1):
            s = " ".join(w[i:i + SHINGLE])
            # a set of DIGESTS, only to count distinct shingles for the
            # provenance; never written out
            seen.add(hashlib.blake2b(s.encode(), digest_size=8).digest())
            for ix in indices(s):
                bits[ix >> 3] |= 1 << (ix & 7)
    n = len(seen)
    filled = sum(bin(b).count("1") for b in bits) / M_BITS
    with open(OUT_BIN, "wb") as f:
        f.write(bytes(bits))
    meta = {
        "_provenance": {
            "what": "A Bloom filter over every run of %d consecutive normalised words in the "
                    "Santhanam translation of BPHS. It recognises a verbatim quotation and "
                    "cannot be read back into text." % SHINGLE,
            "why": "LICENSE.md promises quotation from the translation is kept brief. "
                   "quotation-verify.mjs checks that promise against every shipped page.",
            "source": "BPHS-Santhanam-Vol-1.pdf and BPHS-Santhanam-Vol-2.pdf, the project's "
                      "own uploads, read out as text. Neither the PDFs nor their text are in "
                      "this repository.",
            "generator": "source/test/make-translation-fingerprint.py",
            "checkedBy": "source/test/quotation-verify.mjs",
        },
        "shingle_words": SHINGLE, "m_bits": M_BITS, "k": K,
        "normalisation": "NFKD, combining marks removed, lower-cased, tokens [a-z0-9]+",
        "hash": "h1 = fmix32(FNV-1a(shingle, seed 0x811C9DC5)); h2 = fmix32(FNV-1a(shingle, seed 0x050C5D1F)) | 1; index_i = (h1 + i*h2) mod 2^32 mod m",
        "source_words": total_words, "distinct_shingles": n,
        "fill_ratio": round(filled, 4),
        "per_shingle_false_positive": round(filled ** K, 6),
        "self_check": {"string": "the lord of the lagna is placed in", "indices": indices(
            "the lord of the lagna is placed in")},
    }
    with open(OUT_META, "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=1); f.write("\n")
    print("words %d, distinct shingles %d, fill %.3f, per-shingle FP %.2e" %
          (total_words, n, filled, filled ** K))

if __name__ == "__main__":
    main()
