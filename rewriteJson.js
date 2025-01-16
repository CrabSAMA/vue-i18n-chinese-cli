import fs from 'fs-extra'
import fg from 'fast-glob'
import { join } from 'path'
import { select } from '@inquirer/prompts'

const pattern = ['**/**/(locales|locale|i18n|lang|langs|language|languages|messages)']
const fileRegex = /^(?<locale>[\w-_]+)\.(?<ext>json)$/
async function getLocaleJSONPath(localePath, langKey) {
  const { zhLangKey, enLangKey } = langKey
  const files = await fs.readdir(localePath)
  let enJsonPath, zhJsonPath
  // 遍历 JSON 文件，分别找到中文和英文的文件路径
  for (const filePath of files) {
    const fileRegexResult = fileRegex.exec(filePath)
    if (fileRegexResult) {
      const locale = fileRegexResult.groups?.locale
      if (locale) {
        if (locale.includes(enLangKey)) {
          enJsonPath = join(localePath, filePath)
        } else if (locale.includes(zhLangKey)) {
          zhJsonPath = join(localePath, filePath)
        }
      }
    }
  }
  return {
    enJsonPath,
    zhJsonPath
  }
}

async function mergeI18NJSON(jsonPath, appendContent) {
  // 读取 i18n JSON
  let json = await fs.readJSON(jsonPath)
  // 合并 JSON，新增的 item 将默认会在后面
  json = { ...json, ...appendContent }
  // JSON 序列化成字符串
  const result = JSON.stringify(json, null, 2)
  // 重新写入文件
  fs.writeFile(jsonPath, result)
}

export async function rewriteJSON(path, langKey, appendContent) {
  // copyright from 「lokalise/i18n-ally」
  // https://github.com/lokalise/i18n-ally/blob/4c504c93cec6c4697134eca379f1476d0eb1c9f6/src/commands/configLocalePaths.ts#L65
  const result = await fg(pattern, {
    cwd: path,
    ignore: [
      '**/node_modules',
      '**/dist',
      '**/test',
      '**/tests',
      '**/tmp',
      '**/build',
      '**/.build',
      '**/logs',
      '**/vendor', // PHP
      '**/vendors', // PHP
      '**/target', // Rust
    ],
    onlyDirectories: true,
  })
  if (!result.length) {
    throw new Error('没有找到 i18n 路径')
  }

  const handler = async (dirPath) => {
    const { zhContent, enContent } = appendContent
    const { zhJsonPath, enJsonPath } = await getLocaleJSONPath(dirPath, langKey)
    await mergeI18NJSON(zhJsonPath, zhContent)
    await mergeI18NJSON(enJsonPath, enContent)
  }

  if (result.length === 1) {
    const localePath = join(path, result[0])
    await handler(localePath)
  } else {
    // 多个路径的时候让用户尝试选择
    const answer = await select({
      message: '识别到多个可能的 i18n 路径，请选择：',
      choices: result
    })
    const localePath = join(path, answer)
    await handler(localePath)
  }
}