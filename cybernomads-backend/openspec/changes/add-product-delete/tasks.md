## 1. Contracts And Docs

- [ ] 1.1 更新产品 API 文档，新增 `DELETE /api/products/{productId}`
- [ ] 1.2 更新产品 SQL/契约说明，明确删除元数据和正文文件
- [ ] 1.3 同步主规格中产品删除语义，移除“不支持删除”的旧约束

## 2. Runtime Implementation

- [ ] 2.1 在产品 service 中新增删除方法
- [ ] 2.2 删除前读取产品记录，获取 `contentRef`
- [ ] 2.3 删除产品正文 Markdown 文件
- [ ] 2.4 删除产品元数据
- [ ] 2.5 在产品 controller 中新增 `DELETE /api/products/:productId`
- [ ] 2.6 确保删除不存在产品返回 not found
- [ ] 2.7 不增加任何跨领域引用检查

## 3. Verification

- [ ] 3.1 补充集成测试：创建产品后删除，确认列表不再返回该产品
- [ ] 3.2 补充集成测试：删除后详情读取返回 404
- [ ] 3.3 补充集成测试：删除后 Markdown 文件不存在
- [ ] 3.4 补充测试：删除不存在产品返回 404
- [ ] 3.5 运行产品模块相关测试和全量后端测试

