const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT

class ApiError extends Error {
  constructor(message, status, data) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

async function request(endpoint, options = {}) {
  const url = `${API_ENDPOINT}${endpoint}`
  
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  }

  try {
    const response = await fetch(url, config)
    const data = await response.json()

    if (!response.ok) {
      throw new ApiError(
        data.error || 'An error occurred',
        response.status,
        data
      )
    }

    return data
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError('Network error', 0, { message: error.message })
  }
}

export const api = {
  // GET /items
  getItems: (params = {}) => {
    const searchParams = new URLSearchParams()
    
    if (params.class) searchParams.append('class', params.class)
    if (params.class_type?.length) {
      params.class_type.forEach(ct => searchParams.append('class_type', ct))
    }
    if (params.season?.length) {
      params.season.forEach(s => searchParams.append('season', s))
    }
    if (params.date_acquired?.length) {
      params.date_acquired.forEach(d => searchParams.append('date_acquired', d))
    }
    if (params.search) searchParams.append('search', params.search)
    if (params.sort) searchParams.append('sort', params.sort)
    if (params.order) searchParams.append('order', params.order)

    const query = searchParams.toString()
    return request(`/items${query ? `?${query}` : ''}`)
  },

  // GET /items/:id
  getItem: (id) => {
    return request(`/items/${id}`)
  },

  // POST /items
  createItem: (data) => {
    return request('/items', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // PUT /items/:id
  updateItem: (id, data) => {
    return request(`/items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  // DELETE /items/:id
  deleteItem: (id) => {
    return request(`/items/${id}`, {
      method: 'DELETE',
    })
  },

  // POST /items/upload-url
  getUploadUrl: (filename, contentType) => {
    return request('/items/upload-url', {
      method: 'POST',
      body: JSON.stringify({ filename, content_type: contentType }),
    })
  },

  // Upload file to S3
  uploadToS3: async (presignedUrl, file) => {
    const response = await fetch(presignedUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    })

    if (!response.ok) {
      throw new Error('Failed to upload file')
    }

    return response
  },
}
