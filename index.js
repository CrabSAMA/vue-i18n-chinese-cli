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

import { splitJSON, mergeJSON } from './translateJsonHandler.js'
import { translateRequest } from './bigmodel.js'

;(async function main() {
  const projectPath = process.argv[2]
  if (!projectPath) {
    throw new Error('Please provide a project path')
  }
  // 将路径转换为绝对路径
  const absoluteProjectPath = path.isAbsolute(projectPath)
    ? projectPath
    : path.resolve(projectPath)

  try {
    // 检测路径是否存在
    await access(absoluteProjectPath, constants.F_OK)
  } catch (error) {
    throw new Error(`The path ${absoluteProjectPath} does not exist.`)
  }

  try {
    const report = getVueI18NReport(absoluteProjectPath)
    const { missingKeys } = report

    // 遍历数组，根据语言属性进行分组
    const languageGroupingMissingKeys = missingKeys.reduce((acc, item) => {
      const { language } = item;
      if (!acc[language]) {
        acc[language] = new Set();
      }
      acc[language].add(item.path);
      return acc;
    }, {});

    const translateData = {}
    for (let langKey in languageGroupingMissingKeys) {
      translateData[langKey] = [...languageGroupingMissingKeys[langKey]].map((path) => ({
        key: path,
        value: ''
      }))
    }
    if (translateData['zh-CN']) {
      translateData['zh-CN'].forEach((item) => item.value = item.key)
    }

    if (translateData['en']) {
      const split = splitJSON(translateData['en'], 500)
      const answer = await translateRequest(split[0])
      console.log(answer);
    }

    
    
  } catch (error) {
    console.error(error.response.data)
  }
})()

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
