/** AI 设置表单状态 */
export interface AiFormState {
  provider: Provider;
  apiKey: string;
  /** 选中的模型 ID；自定义服务商时由用户手动填写 */
  model: string;
  /** 自定义 Base URL（Ollama/自定义服务商等本地或第三方服务需要） */
  baseUrl: string;
  /** 采样温度 0.0–2.0 */
  temperature: string;
  /** 最大输出 Token 数 */
  maxTokens: string;
  /** 发给模型的系统提示词 */
  systemPrompt: string;
  /** 自定义服务商名称（仅 provider === "custom" 时使用） */
  customName: string;
  id: string;
}
