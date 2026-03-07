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


def test_get_prompt_banned_words_from_yaml():
    prompt_config._load_prompt_config.cache_clear()
    words = prompt_config.get_prompt_banned_words()
    assert "仇恨" in words
    assert "身份证" in words


def test_get_prompt_default_length_from_yaml():
    prompt_config._load_prompt_config.cache_clear()
    assert prompt_config.get_prompt_default_length() == "medium"


def test_get_prompt_length_distribution_from_yaml():
    prompt_config._load_prompt_config.cache_clear()
    distribution = prompt_config.get_prompt_length_distribution()
    assert distribution["medium"] == 0.8
    assert distribution["long"] == 0.15
    assert distribution["extra_long"] == 0.05
