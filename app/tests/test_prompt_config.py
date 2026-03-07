from app.services import prompt_config


def test_get_prompt_skip_keywords_from_yaml():
    prompt_config._load_prompt_config.cache_clear()
    keywords = prompt_config.get_prompt_skip_keywords()
    assert "广告" in keywords
    assert "vx" in keywords


def test_get_prompt_action_pool_from_yaml():
    prompt_config._load_prompt_config.cache_clear()
    actions = prompt_config.get_prompt_action_pool()
    assert "(轻轻靠近)" in actions
    assert "(小声嘟囔)" in actions
