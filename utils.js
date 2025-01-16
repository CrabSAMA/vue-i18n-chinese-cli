export async function isFileExisted(path) {
  try {
    // 检测路径是否存在
    await access(path, constants.F_OK)
    return true
  } catch {
    return false
  }
}