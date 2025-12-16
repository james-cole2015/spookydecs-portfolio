import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Header } from '@/components/layout/Header'
import { ItemsListPage } from '@/pages/ItemsListPage'
import { CreateItemPage } from '@/pages/CreateItemPage'
import { ItemDetailsPage } from '@/pages/ItemDetailsPage'
import { EditItemPage } from '@/pages/EditItemPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Navigate to="/items" replace />} />
              <Route path="/items" element={<ItemsListPage />} />
              <Route path="/items/new" element={<CreateItemPage />} />
              <Route path="/items/:itemId" element={<ItemDetailsPage />} />
              <Route path="/items/:itemId/edit" element={<EditItemPage />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
