#!/bin/bash

# 批量安装所有云函数的依赖

cd "$(dirname "$0")/../cloudfunctions"

echo "开始安装云函数依赖..."

for dir in */; do
    if [ -f "$dir/package.json" ]; then
        echo ""
        echo "正在安装: $dir"
        cd "$dir"
        npm install
        cd ..
    fi
done

echo ""
echo "所有云函数依赖安装完成！"
