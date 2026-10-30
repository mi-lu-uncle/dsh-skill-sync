#!/usr/bin/env bash
# Update the configured mirror without discarding local work, then reconcile
# only links owned by that mirror. A conflicting directory or foreign link is
# reported and left untouched.
set -euo pipefail

REPO="${MATTPOCOCK_REPO:-$HOME/.dsh/repos/mattpocock-skills}"
DEST="${MATTPOCOCK_DEST:-$HOME/.dsh/skills}"
if [ ! -d "$REPO/skills" ]; then
  echo "更新失败：找不到技能镜像 ${REPO}；请先克隆 https://github.com/mattpocock/skills。" >&2
  exit 1
fi
REPO="$(cd "$REPO" && pwd -P)"
before="$(git -C "$REPO" rev-parse --short HEAD)"
git -C "$REPO" fetch --prune origin
branch="$(git -C "$REPO" symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null || echo origin/main)"
if ! git -C "$REPO" merge --ff-only "$branch" >/dev/null; then
  echo "更新失败：镜像无法快进，请手动处理 ${REPO}。" >&2
  exit 1
fi
after="$(git -C "$REPO" rev-parse --short HEAD)"

mkdir -p "$DEST"
linked=0
conflicts=0
while IFS= read -r -d '' skill_md; do
  src="$(dirname "$skill_md")"
  target="$DEST/$(basename "$src")"
  if [ -L "$target" ]; then
    current="$(readlink "$target")"
    [ "$current" = "$src" ] && continue
    case "$current" in
      */../*|*/..) echo "冲突：保留已有链接 $target"; conflicts=$((conflicts + 1)); continue ;;
      "$REPO"/*) ;;
      *) echo "冲突：保留已有链接 $target"; conflicts=$((conflicts + 1)); continue ;;
    esac
  elif [ -e "$target" ]; then
    echo "冲突：保留已有文件或目录 $target"
    conflicts=$((conflicts + 1))
    continue
  fi
  ln -sfn "$src" "$target"
  linked=$((linked + 1))
done < <(find "$REPO/skills" -name SKILL.md -not -path '*/deprecated/*' -not -path '*/misc/*' -print0)

removed=0
for link in "$DEST"/*; do
  [ -L "$link" ] || continue
  case "$(readlink "$link")" in
    */../*|*/..) continue ;;
    "$REPO"/*)
      if [ ! -f "$link/SKILL.md" ]; then
        rm -f "$link"
        removed=$((removed + 1))
      fi ;;
  esac
done

if [ "$before" = "$after" ]; then
  echo "已是最新（${after}）。"
else
  echo "已更新：${before} → ${after}。"
fi
echo "链接：新增/修正 ${linked} 个；清理死链 ${removed} 个；冲突 ${conflicts} 个。"
