# dsh-skill-sync

[English](README.md) | [简体中文](README.zh-CN.md) | 日本語

mattpocock スキル同期スクリプトの薄いラッパーで、DSH コマンドとオプトインの定期タイマーとして公開されます。

## なぜ作ったか

DSH のファイルシステムスキルプロバイダは `git pull` の後にスキルディレクトリをホットリロードします（watcher はデフォルトでシンボリックリンクを追跡）が、pull を**起動する**ものも、シンボリックリンクを同期し続けるものもありません。同期スクリプトはその両方を担います：

1. origin からミラーを fast-forward で更新し、
2. スキルルート内のシンボリックリンクを突き合わせる — 新しく追加されたスキルをリンクし、移動されたものを修復し、削除・非推奨になったスキルの古いリンクを取り除く。

このプラグインはそのスクリプトを実行するだけです：

- 即時同期のための `/skills-sync` コマンドと、
- **オプトイン**の定期タイマー（`auto: true` で有効化。デフォルトはオフ）。

## 使い方

```
/skills-sync        # 同期スクリプトを即時実行し、レポートを表示
```

## 設定

プロファイルパッチ（`cordis.patch.yml`）の `skill-sync` 行で指定します：

```yaml
- id: skill-sync
  config:
    script: /absolute/path/to/custom-sync.sh                # 省略時は同梱スクリプト
    intervalMs: 1800000                                     # デフォルト: 30 分
    auto: false                                             # デフォルト: false（true で定期実行）
```

## インストール

インストール前にミラーをクローンしてください。同名のファイルやディレクトリ、別のソースのリンクは保持して衝突として報告します。履歴が分岐した場合はリセットせずエラーを返します。

```sh
mkdir -p ~/.dsh/repos
git clone https://github.com/mattpocock/skills ~/.dsh/repos/mattpocock-skills
dsh plugin --profile desktop add /absolute/path/to/dsh-skill-sync
```

その後、反映のために **DSH を再起動**してください。

## テスト

```sh
node test/smoke.mjs            # ラッパー: コマンド登録とスクリプト出力の転送
node test/sync-script.test.mjs # スクリプト: テンポラリリモートに対する pull + リンク同期
```
