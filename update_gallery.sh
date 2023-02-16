#!/usr/bin/python3

import glob
import json

files = glob.glob("assets/images/*.png")
files += glob.glob("assets/images/*.jpg")
files = sorted(files)

with open("src/js/images.json", "w") as fp:
    json.dump(files, fp, indent=4)


