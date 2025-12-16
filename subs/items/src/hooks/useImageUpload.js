import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useImageUpload() {
  return useMutation({
    mutationFn: async (file) => {
      // Get presigned URL
      const { upload_url, s3_key } = await api.getUploadUrl(
        file.name,
        file.type
      )

      // Upload to S3
      await api.uploadToS3(upload_url, file)

      // Return the S3 key for use in item creation
      return { s3_key }
    },
  })
}
