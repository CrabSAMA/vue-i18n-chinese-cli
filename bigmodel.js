import axios from 'axios'
import ora from 'ora'
const prompt = `
您将担任翻译、拼写纠正和改进员。您将收到一份JSON，格式如下：
\`\`\`json
[
  { "key": "翻译", "value": "" }
]
\`\`\`
请按照以下要求完成任务：
纠正任何错误并将key属性值的内容中文翻译成英文。中文的标点符号请调整成英文对应的标点符号，如没有对应的英文标点则不需要调整。
请不要对结果作任何解释。请按顺序逐一翻译，key的值是需要翻译的中文，翻译后的内容需要填入到value的值中。
回复前，请检查是否符合JSON字符串的格式，如果不满足格式，请使用转义字符等方式将内容变为符合格式的JSON字符串。
最终请你直接输出JSON字符串，不要使用代码块进行包裹。
你可以参考这个输出的例子：
\`\`\`json
[
  { "key": "翻译", "value": "Translate" }
]
\`\`\`
`

export async function translateRequest(translateJSON) {
  const spinner = ora('翻译中……').start();
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
      // TODO APIKEY
      'Authorization': 'Bearer '
    }
  })

  const { data } = res
  const answer = data?.choices?.[0]?.message?.content
  spinner.succeed('翻译成功')
  
  return answer
}