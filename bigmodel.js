import axios from 'axios'
import { readFile } from 'fs/promises'


const prompt = `
您将担任翻译、拼写纠正和改进员。您将收到一份JSON，JSON内容是一个JSON数组。
请按照以下要求完成任务：
纠正任何错误并将每一项中文翻译成英文。中文的标点符号请调整成英文对应的标点符号，如没有对应的英文标点则不需要调整。
请不要对结果作任何解释。请按顺序逐一翻译。
回复前，请检查是否符合JSON字符串的格式，如果不满足格式，请使用转义字符等方式将内容变为符合格式的JSON字符串。
最终请你直接输出JSON字符串，不要使用代码块进行包裹。
`

export async function translateRequest(translateJSON) {
  let apiKey
  try {
    apiKey = await readFile('./API_KEY', 'utf-8')
  } catch (error) {
    throw new Error('Please provide a API_KEY')
  }

  const res = await axios.post('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
    model: 'glm-4-flash',
    messages: [
      { role: 'system', content: prompt },
      { role: 'user', content: translateJSON }
    ],
    temperature: 0.5,
    top_p: 0.7
  }, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    }
  })

  const { data } = res
  const answer = data?.choices?.[0]?.message?.content
  
  return answer
}