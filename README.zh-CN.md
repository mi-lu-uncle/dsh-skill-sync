# dsh-skill-sync

[English](README.md) | 简体中文 | [日本語](README.ja.md)

围绕 mattpocock 技能同步脚本的薄封装，暴露成一个 DSH 命令和一个可选的定时器。

## 为什么做这个

DSH 的文件系统技能提供方会在 `git pull` 之后热重载技能目录（它的 watcher 默认会跟随符号链接），但没有任何东西去**触发** pull，也没有东西保持符号链接同步。同步脚本把这两半都做了：

1. 从 origin 快进更新镜像，然后
2. 对账技能根目录下的符号链接——链接新增的技能、修复被移动的、清掉已删除或已弃用技能的过期链接。

本插件只是运行这个脚本：

- 一个 `/skills-sync` 命令用于立即同步，以及
- 一个**可选**的定时器（`auto: true` 开启；默认关闭）。

## 用法

```
/skills-sync        # 立即运行同步脚本并显示其报告
```

## 配置

在 profile 补丁（`cordis.patch.yml`）的 `skill-sync` 行上设置：

```yaml
- id: skill-sync
  config:
    script: /绝对路径/custom-sync.sh                        # 可选，默认使用插件内置脚本
    intervalMs: 1800000                                     # 默认: 30 分钟
    auto: false                                             # 默认: false（设 true 开启定时）
```

## 安装

安装前请先克隆镜像。同名的真实文件、目录和其他来源的链接会保留并报告冲突；历史分叉时会报错，不会重置镜像。

```sh
mkdir -p ~/.dsh/repos
git clone https://github.com/mattpocock/skills ~/.dsh/repos/mattpocock-skills
dsh plugin --profile desktop add /absolute/path/to/dsh-skill-sync
```

然后**重启 DSH** 使其生效。

## 测试

```sh
node test/smoke.mjs            # 封装层：注册命令、转发脚本输出
node test/sync-script.test.mjs # 脚本层：对临时远端做 pull + 符号链接对账
```
