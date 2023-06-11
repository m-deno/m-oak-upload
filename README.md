# m-oak-upload
oak文件上传中间件

## 默认配置

> maxFileSize: 5M
randomName: true
```ts
import { upload } from 'https://deno.land/x/m_oak_upload';

router.post('/upload', upload("uploads") , UploadController.upload)
```
## 限制文件大小
```ts
import { upload } from 'https://deno.land/x/m_oak_upload';

router.post('/upload', upload("uploads", { maxFileSize: 2*1024*1024, randomName: true }) , UploadController.upload)
```
## 随机文件名称
```ts
import { upload } from 'https://deno.land/x/m_oak_upload';

router.post('/upload', upload("uploads", { randomName: true }) , UploadController.upload)
```
## 文件名称过滤，文件数量大小
```ts
import { upload } from 'https://deno.land/x/m_oak_upload';

router.post('/upload', upload("uploads", { files: ['file', 'file2'] }) , UploadController.upload)
```
## 文件数量限制
```ts
import { upload } from 'https://deno.land/x/m_oak_upload';

router.post('/upload', upload("uploads", { maxFile: 2  }) , UploadController.upload)
```
## 文件后缀过滤
```ts
import { upload } from 'https://deno.land/x/m_oak_upload';

router.post('/upload', upload("uploads", { exts: ['ts', 'png', 'jpg'] }) , UploadController.upload)
```