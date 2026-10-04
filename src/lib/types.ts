export type Role = 'user' | 'staff' | 'admin'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: Role
  created_at: string
}

export type OrderStatus = 'pending' | 'approved' | 'rejected'
export type PaymentMethod = 'bkash' | 'nagad'

export interface Product {
  id: string
  name: string
  slug: string
  description: string | null
  category: string | null
  price: number
  original_price: number | null
  version: string | null
  /** Card preview image (absolute URL on your own hosting, or a /path). */
  image_url: string | null
  is_active: boolean
  download_count: number
  created_at: string
}

export interface Order {
  id: string
  user_id: string
  product_id: string
  /** Denormalized product name (Firestore has no joins). */
  product_name: string
  amount: number
  method: PaymentMethod
  trx_id: string
  status: OrderStatus
  created_at: string
  product?: Product | null
  buyer?: Pick<Profile, 'email' | 'full_name'> | null
}

export type LicenseStatus = 'active' | 'revoked'

export interface License {
  id: string
  user_id: string
  product_id: string | null
  label: string
  key: string
  status: LicenseStatus
  max_devices: number
  expires_at: string | null
  created_at: string
}

export interface LicenseDevice {
  id: string
  license_id: string
  /** Owner of the license (denormalized for simple security rules). */
  user_id?: string
  device_id: string
  first_seen_at: string
  last_seen_at: string
  revoked: boolean
}

export interface SiteSettingsRow {
  key: string
  value: string
}
