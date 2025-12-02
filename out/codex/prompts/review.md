---
description: 审查代码改动并给出建议
argument-hint: "[issue]"
arguments:
  - name: issue
    type: string
    required: false
    hint: Issue 编号
x-preserve:
  metadata:
    extra:
      author: adapter
      tags:
        - review
  runtime:
    model: gpt-5-codex
    temperature: 0.2
---

请审查当前工作区的改动，重点关注可读性与性能风险。

## Examples
- /review 1234