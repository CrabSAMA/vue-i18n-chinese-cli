// FIXME https://github.com/Spittal/vue-i18n-extract/issues/206
import {
  readVueFiles,
  readLanguageFiles,
  extractI18NItemsFromVueFiles,
  extractI18NLanguageFromLanguageFiles,
  extractI18NReport,
} from 'vue-i18n-extract/dist/vue-i18n-extract.modern.mjs'
import path from 'path'
import { access, constants } from 'fs/promises'
import ora from 'ora'
import { splitJSON } from './translateJsonHandler.js'
import { translateRequest } from './bigmodel.js'
import { rewriteJSON } from './rewriteJson.js'

function getVueI18NReport(projectPath) {
  const vueFilesGlob = path.resolve(projectPath, 'src', '**/*.?(js|ts|vue)')
  const languageFilesGlob = path.resolve(
    projectPath,
    'src/{locale,locales,lang,langs}',
    '**/*.?(json|yml|yaml)'
  )

  const vueFiles = readVueFiles(path.resolve(process.cwd(), vueFilesGlob))
  const languageFiles = readLanguageFiles(
    path.resolve(process.cwd(), languageFilesGlob)
  )
  const I18NItems = extractI18NItemsFromVueFiles(vueFiles)
  const I18NLanguage = extractI18NLanguageFromLanguageFiles(languageFiles)
  const report = extractI18NReport(I18NItems, I18NLanguage)

  return report
}

async function main() {
  // 接受传参，如果不传参的话就取当前目录执行
  const projectPath = process.argv[2] || '.'
  if (!projectPath) {
    throw new Error('请提供项目路径')
  }
  // 将路径转换为绝对路径
  const absoluteProjectPath = path.isAbsolute(projectPath)
    ? projectPath
    : path.resolve(projectPath)

  try {
    // 检测路径是否存在
    await access(absoluteProjectPath, constants.F_OK)
  } catch (error) {
    throw new Error(`项目路径 ${absoluteProjectPath} 不存在`)
  }

  try {
    const report = getVueI18NReport(absoluteProjectPath)
    const { missingKeys } = report    

    // 遍历数组，根据语言属性进行分组
    const languageGroupingMissingKeys = missingKeys.reduce((acc, item) => {
      const { language } = item
      if (!acc[language]) {
        acc[language] = new Set()
      }
      acc[language].add(item.path)
      return acc
    }, {})

    let zhLangKey, enLangKey
    for (let langKey in languageGroupingMissingKeys) {
      // Set -> Array
      languageGroupingMissingKeys[langKey] = Array.from(
        languageGroupingMissingKeys[langKey]
      )
      if (!enLangKey && langKey.includes('en')) {
        enLangKey = langKey
      } else if (!zhLangKey && langKey.includes('zh')) {
        zhLangKey = langKey
      }
    }

    // translateData 即最终输出的 i18n JSON
    const translateData = {}

    // 初始化 i18n JSON 格式
    for (let langKey in languageGroupingMissingKeys) {
      translateData[langKey] = languageGroupingMissingKeys[langKey].reduce((acc, path) => {
        // 中文 i18n JSON 直接使用 path 作为 value 值
        acc[path] = langKey === zhLangKey ? path : ''
        return acc
      }, {})
    }

    // 英文 i18n JSON 使用大模型进行翻译
    if (languageGroupingMissingKeys[enLangKey]) {
      // 由于 token 限制，使用 splitJSON 进行切分
      const split = splitJSON(languageGroupingMissingKeys[enLangKey], 800)

      const spinner = ora('翻译中……').start();

      const answerList = []
      // 遍历切割后的 JSON
      for (const item of split) {
        const answer = await translateRequest(item)
        const obj = JSON.parse(answer)
        answerList.push(...obj)
      }
      // translateData[enLangKey] 是一个对象
      // Object.keys(translateData[enLangKey) 和 answerList 数组长度一致，直接遍历使用 index 取值与赋值
      Object.keys(translateData[enLangKey]).forEach((key, index) => {
        translateData[enLangKey][key] = answerList[index]
      })

      spinner.succeed('翻译成功')
    }

    // 文件输出
    await rewriteJSON(absoluteProjectPath, {
      zhLangKey,
      enLangKey
    }, {
      zhContent: translateData[zhLangKey],
      enContent: translateData[enLangKey]
    })
  } catch (error) {
    throw error
  }
}

main()