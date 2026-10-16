# dsh-skill-sync

[English](README.md) | [简体中文](README.zh-CN.md) | 日本語

mattpocock スキル同期スクリプトの薄いラッパーで、DSH コマンドとオプトインの定期タイマーとして公開されます。

## なぜ作ったか

DSH のファイルシステムスキルプロバイダは `git pull` の後にスキルディレクトリをホットリロードします（watcher はデフォルトでシンボリックリンクを追跡）が、pull を**起動する**ものも、シンボリックリンクを同期し続けるものもありません。同期スクリプトはその両方を担います：

1. ミラーに対して `git pull --ff-only` を実行し、
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
    script: /Users/you/.dsh/bin/mattpocock-skills-sync.sh  # デフォルト: ~/.dsh/bin/mattpocock-skills-sync.sh
    intervalMs: 1800000                                     # デフォルト: 30 分
    auto: false                                             # デフォルト: false（true で定期実行）
```

## インストール

```sh
dsh plugin --profile desktop add /absolute/path/to/dsh-skill-sync
```

その後、反映のために **DSH を再起動**してください。

## テスト

```sh
node test/smoke.mjs            # ラッパー: コマンド登録とスクリプト出力の転送
node test/sync-script.test.mjs # スクリプト: テンポラリリモートに対する pull + リンク同期
```
