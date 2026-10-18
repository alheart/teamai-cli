# Gitea Provider（自托管）

`gitea` provider 直接使用实例 REST API 和 Git，不需要额外的平台 CLI。接入前设置完整实例地址：

```bash
export GITEA_URL=https://gitea.example.com
teamai init https://gitea.example.com/your-org/team.git --scope user
```

未知 HTTP(S) host 可通过匿名版本接口探测给出配置提示；探测不代表允许向该 host 发送 token。
设置 `GITEA_URL` 后重试。本实现不把 gitea.com 全局映射为 Gitea。本地 Forgejo 15.0.10 已验证 init、push、PR 创建、reviewer 指派及实际 AI 后端的 PR 提取；main 另验证评审讨论读取，0.27 回移版不读取讨论。此实测子集不代表所有 Forgejo 版本或部署均已兼容。

## 认证和 URL

设置 `GITEA_TOKEN`，或在 init 的隐藏终端提示中粘贴 PAT。程序先通过 `GET /api/v1/user`
验证，再以 `0600` 权限写入 `~/.netrc`。非交互运行必须已有 env/netrc token，缺失时立即失败；
已配置但无效的 token 会明确报错，不会反复启动登录。

PAT 需要覆盖仓库、PR/reviewer/评论、用户身份以及所使用的组织操作。不同服务器版本的 scope
可能不同，应依据目标实例 API 核对。管理员应在成员接入前创建组织和团队仓库；私有仓库的
404 也可能表示无权访问，程序不会据此自动引导创建另一个仓库。

`GITEA_URL` 保留 HTTP(S) 协议、端口和反向代理子路径。HTTP 仓库/PR URL 必须匹配完整
origin 和 base 路径。可选 `TEAMAI_GITEA_HOST` 必须是同一 hostname，填写 HTTP 端口时也须一致。
SSH 可使用不同端口，但本期不支持不同 hostname 的 SSH 别名：

```bash
export GITEA_URL=https://gitea.example.com/sub/path
teamai init ssh://git@gitea.example.com:2222/your-org/team.git --scope user
```

SSH init 仍需 PAT 验证平台身份，clone 及后续 Git 操作保留 SSH URL 并使用公钥。
浅克隆导入的 `--ssh` 需提供带端口的显式 SSH URL，不能要求 CLI 从 HTTP URL 猜测 SSH 端口。

REST 使用 `Authorization: token <PAT>`；HTTP Git 用已验证 login 和 token 做 Basic 认证。
私有团队 clone 将凭据保存在 origin URL，供后续裸 `git push` 使用，因此应按含凭据目录保护。
浅克隆资源使用一次性 header。修改 env/netrc 不会替换已有 origin 中的旧 token；轮换后需更新
该 clone 的认证并分别验证 API 和 Git。迁移 HTTPS 也需更新保存的 remote，不能只改 `GITEA_URL`。

netrc 按 hostname 匹配，不分端口。同 host 的不同认证服务应隔离用户目录或显式管理凭据，
测试实例不能覆盖其他服务的 netrc 条目。

## 分享、导入与权限

`teamai push --all` 推分支、创建 PR，并按 Gitea login 请求 reviewers。已有 PR 按双方仓库及
双方分支精确匹配，不能只看 head。reviewer 逐个请求：无效账号产生 warning，已创建的 PR 和
其他有效邀请仍保留。

管理员先初始化 TeamAI 骨架和 reviewers 配置，再保护默认分支。普通成员需要工作分支及
reports/learnings 分支写权限、PR 权限，不需要直接推送 main 的权限。

0.27 回移版支持 `teamai import --from-mr <instance>/org/repo/pulls/N` 的 PR 元信息、分页
commits 和有限大小的 diff；超过 50 KiB 会标注证据不完整，必需证据读取失败会终止导入。
评审讨论读取需要较新的 main 实现。生成的 learning 草稿须经内容复核后再分享，生成成功不代表结论都有来源支持。本期不支持 Gitea 的 CI 提取/评论命令或 Actions 模板。

公开仓库可匿名浅克隆和 fetch，这不等于匿名 init、成员注册或 push。`teamai doctor` 检查
实例 URL 配置和 token 是否存在；token 是否有效须通过真实 API 请求确认。

## 从 generic Git 迁移

所有成员先安装支持 Gitea 的版本，再将团队 manifest 改为 `provider: gitea`。混用旧版期间，
新版成员可用 `teamai init <url> --provider gitea` 单独试用，团队继续保留 `provider: git`。
成员本地显式选择优先于团队配置，曾设置 `--provider git` 的成员需重新初始化。团队配置修改
经 PR 合并后，以普通成员能自动创建并更新 PR 作为验收。

参见 [English guide](gitea-provider.md)。
