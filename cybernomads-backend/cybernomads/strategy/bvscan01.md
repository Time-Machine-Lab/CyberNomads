# 爬取 B 站候选视频

围绕关键词 {{string:target_keyword="AI工具"}} 在 B 站检索候选视频，优先选择最近 {{int:recent_days=14}} 天内发布、播放量不低于 {{int:min_play_count=5000}} 的内容。

执行要求：
- 记录视频标题、UP 主、播放量、弹幕密度、评论数和发布时间。
- 优先保留标题里出现强需求词的视频，例如教程、测评、避坑、效率、自动化。
- 如果候选结果超过 {{int:max_video_count=30}} 条，先按评论活跃度排序，再截取前置结果。

输出格式：
- `video_title`
- `author_name`
- `video_url`
- `reason`
- `lead_angle`
