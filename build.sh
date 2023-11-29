#!/bin/bash

if [ -z "$1" ] 
then
    echo "version number required, e.g. ./build.sh 1.0.0"
    exit 1
fi
rm -rf packs/abilities/ packs/gear/ packs/manual/ packs/roles/ packs/specialties/
rm -rf dist/
mkdir dist
yarn gulp build
yarn gulp pack
zip -r dist/candelafvtt-v${1}.zip css/ img/ lang/ module/ packs/  templates/ ./CHANGELOG.md ./LICENSE.txt ./NOTES.md ./system.json ./template.json -x "packs/src/*"