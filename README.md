# m-oak-upload
oak文件上传中间件

## 配置
### 默认配置

> maxFileSize: 5M
randomName: true
```ts
import { upload } from 'https://deno.land/x/m_oak_upload';

router.post('/upload', upload("uploads") , UploadController.upload)
```
### 限制文件大小
```ts
import { upload } from 'https://deno.land/x/m_oak_upload';

router.post('/upload', upload("uploads", { maxFileSize: 2*1024*1024, randomName: true }) , UploadController.upload)
```
### 随机文件名称
```ts
import { upload } from 'https://deno.land/x/m_oak_upload';

router.post('/upload', upload("uploads", { randomName: true }) , UploadController.upload)
```
### 文件名称过滤，文件数量大小
```ts
import { upload } from 'https://deno.land/x/m_oak_upload';

router.post('/upload', upload("uploads", { files: ['file', 'file2'] }) , UploadController.upload)
```
### 文件数量限制
```ts
import { upload } from 'https://deno.land/x/m_oak_upload';

router.post('/upload', upload("uploads", { maxFile: 2  }) , UploadController.upload)
```
### 文件后缀过滤
```ts
import { upload } from 'https://deno.land/x/m_oak_upload';

router.post('/upload', upload("uploads", { exts: ['ts', 'png', 'jpg'] }) , UploadController.upload)
```

## 获取文件
```ts
const upload = (ctx: any) => {
  const { files, errors } = ctx.uploads
  // 处理错误
  if (errors) {
    ctx.response.body = response(400, errors)
    return
  }
  const retArr:Omit<IFile, 'originalName'|'tmpUrl'|'path'>[] = []
  // 没有错误
  if (files) {
    const uploadFilesList = files as IFile[]
    for (const uploadFile of uploadFilesList) {
      retArr.push({
        fileName: uploadFile.fileName,
        name: uploadFile.name,
        ext: uploadFile.ext,
        size: uploadFile.size,
        url: uploadFile.url
      })
    }
  }
  ctx.response.body = response(200, retArr)
}
```