// 文件上传中间件
import { FormDataFile, join, ensureDirSync, moveSync } from './deps.ts'

export interface IFile {
  originalName: string // 文件上传时的原始名称
  name: string // 文件名
  ext: string // 文件扩展名
  fileName: string // 新文件名称
  size: number // 文件大小
  tmpUrl: string|undefined // 文件临时路径
  url: string // 文件url，服务路径
  path: string // 文件所在物理路径
}

export interface IOptions {
  maxFileSize?: number, // 文件最大尺寸
  randomName?: boolean // 开启随机文件名
  maxFile?: number|undefined, // 最大文件数量
  files?: string[]|undefined, // 文件上传的名称file
  exts?: string[]|undefined, // 文件扩展
}

export interface IFileError {
  file: string // 报错对应的上传文件名称
  msg: string // 错误描述
}

// 默认值
const defaultIOptions: IOptions = {
  maxFileSize: 5 * 1024 * 1024, // 单位b, 默认限制大小5M
  randomName: true,
  files: undefined,
  maxFile: undefined,
  exts: undefined
};

// 从请求头中匹配文件数据
const boundaryRegex = /^multipart\/form-data;\sboundary=(?<boundary>.*)$/;

// 同步创建文件上传目录
function uploadFileDirPath(uploadPath: string) {
  if (uploadPath) {
    // 同步创建目录
    ensureDirSync(uploadPath);
  }
}

// 过滤文件上传key
function filterFileKeys(files: string[]|undefined, fileList: FormDataFile[]):FormDataFile[] {
  if (!files) {
    return fileList
  }
  const foundedFiles: FormDataFile[] = []
  files.forEach(name => {
    const foundedFile = fileList.find((file: FormDataFile) => file.name === name);
    if (foundedFile) {
      foundedFiles.push(foundedFile);
    }
  });
  return foundedFiles
}

// 过滤文件后缀名
function filterFileExts(exts: string[]|undefined, fileList: FormDataFile[]):FormDataFile[] {
  if (!exts) {
    return fileList
  }
  const foundedFiles: FormDataFile[] = []
  exts.forEach(extName => {
    const foundedFile = fileList.find((file: FormDataFile) => {
      // 获取文件名称及扩展
      const [_, ext] = file.originalName.split('.')
      return ext === extName
    });
    if (foundedFile) {
      foundedFiles.push(foundedFile);
    }
  });
  return foundedFiles
}

// 处理最大文件数
function filterFileMaxNumber(maxFileNumber: number|undefined, fileList: FormDataFile[]) {
  if (maxFileNumber && maxFileNumber > 0) { 
    return fileList.splice(0, maxFileNumber)
  }
  return fileList
}

/**
 * 文件上传中间件
 * 
 * @example
 * ```ts
 * import { upload } from 'https://deno.land/x/m_oak_upload';
 *
 * router.post('/upload', upload("uploads") , UploadController.upload)
 * ```
 * ```ts
 * import { upload } from 'https://deno.land/x/m_oak_upload';
 * 
 * router.post('/upload', upload("uploads", { maxFileSize: 2*1024*1024, randomName: true }) , UploadController.upload)
 * ```
 * ```ts
 * import { upload } from 'https://deno.land/x/m_oak_upload';
 *
 * router.post('/upload', upload("uploads", { files: ['file', 'file2'], maxFile: 2  }) , UploadController.upload)
 * ```
 * ```ts
 * import { upload } from 'https://deno.land/x/m_oak_upload';
 *
 * router.post('/upload', upload("uploads", { exts: ['ts', 'png', 'jpg'] }) , UploadController.upload)
 * ```
 * @param {string} path 文件上传存放的目录
 * @param {IOptions} options 可选项配置
 * @returns
 */
export function upload(path='uploads', options:IOptions=defaultIOptions) {
  return async(ctx: any, next: CallableFunction) => {
    if (options) {
      options = {
        ...defaultIOptions , ...options,
      };
    }
    // 请求头
    const contentType = ctx.request.headers.get('content-type')
    if (!contentType || !contentType.match(boundaryRegex)) {
      ctx.throw(
        422,
        '请求类型错误，请确认请求类型为multipart\/form-data',
      );
    }
    // 从body value中读取表单数据
    const body = await ctx.request.body({ type: "form-data" });
    const formData = await body.value.read();
    if (!formData.files) {
      ctx.throw(
        422,
        '当前请求未上传任何文件',
      );
    }
    // 结果文件列表
    const retFileList: IFile[] = []
    let fileList: FormDataFile[] = formData.files
    const fileErrors: IFileError[] = []
    // 上传文件的路径
    const uploadPath = `${Deno.cwd()}/${path}`
    // 创建目录
    uploadFileDirPath(uploadPath)

    // 筛选文件name, 上传时的key
    const foundedFiles: FormDataFile[] = filterFileKeys(options.files, fileList)
    fileList = foundedFiles;

    // 处理扩展名
    const foundedFileExts: FormDataFile[] = filterFileExts(options.exts, fileList)
    fileList = foundedFileExts;

    // 处理文件最大数量
    const foundedFileMaxNumbers: FormDataFile[] = filterFileMaxNumber(options.maxFile, fileList)
    fileList = foundedFileMaxNumbers;

    // 遍历最终结果文件，传递到下一个中间件
    for (const file of fileList) {
      // 获取临时文件的文件状态
      const stat = await Deno.stat(file.filename as string)
      // 处理文件大小校验
      if (options.maxFileSize && options.maxFileSize < stat.size) {
        fileErrors.push({
          file: file.originalName,
          msg: '文件超过尺寸限制'
        });
        continue
      }
      // 获取文件名称及扩展
      const [name, ext] = file.originalName.split('.')
      let newFileName = name
       // 随机文件名
       if (options.randomName) {
        newFileName = `${crypto.randomUUID()}-${name}`
      }
      // 带后缀的文件名
      const newFileFullName = `${newFileName}.${ext.toLowerCase()}`
      // 构建文件对象
      const fileObj: IFile = {
        originalName: file.originalName,
        name: newFileName,
        ext: ext.toLowerCase(),
        fileName: newFileFullName,
        size: stat.size / 1048576, // M
        tmpUrl: file.filename,
        path: join(uploadPath, newFileFullName),
        url: `${path}/${newFileFullName}`
      }
      // 缓存文件存在会同步到上传目录
      if (fileObj.tmpUrl) {
        moveSync(fileObj.tmpUrl, fileObj.path);
      }
      retFileList.push(fileObj)
    }
    // 向下一个中间件暴漏数据
    ctx['uploads'] = {
      'files': retFileList,
      'errors': fileErrors.length > 0 ? fileErrors : null
    }
    await next()
  }
}