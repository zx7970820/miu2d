#!/bin/bash

# 同步 MinIO 文件到数据库
# 使用 mc 列出文件，然后调用 Node 脚本创建数据库记录

GAME_SLUG="enozheng123-gmail-com"
PREFIX="game/${GAME_SLUG}/resources/"

echo "Listing files from MinIO..."
mc ls --recursive local/miu2d/${PREFIX} > /tmp/minio-files.txt

echo "Creating database records..."
node -r esbuild-register scripts/import-files.ts

echo "Done!"
