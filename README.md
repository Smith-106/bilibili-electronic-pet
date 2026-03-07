# Bilibili 电子宠物

这是一个用于评论回复自动化的 Bilibili 电子宠物项目。

## 当前能力
- 管理页与角色卡工作台
- 角色卡优先级生成链路（显式角色卡 > 激活角色卡 > 兼容 role_profile）
- `prompt_doro.yaml` 配置驱动（skip keywords / action pool / banned words / length policy）
- 云端 CI（pytest + Docker build）

## 本地开发

```bash
pip install -r requirements.txt
pytest app/tests -q
```

## 运行（Docker）

```bash
docker compose up -d --build
```

健康检查：

```bash
curl -sS http://127.0.0.1:8000/health
```
