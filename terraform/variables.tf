variable "vercel_api_token" {
  description = "Vercel API token (create at vercel.com/account/tokens)"
  type        = string
  sensitive   = true
}

variable "project_name" {
  description = "Vercel project name"
  type        = string
  default     = "scheduling-app"
}

variable "github_repo" {
  description = "GitHub repository in 'owner/repo' format"
  type        = string
}

# Auth0
variable "auth0_secret" {
  type      = string
  sensitive = true
}

variable "app_base_url" {
  description = "Public URL of the app, e.g. https://scheduling-app.vercel.app"
  type        = string
}

variable "auth0_domain" {
  description = "Auth0 tenant domain (no https://), e.g. your-tenant.us.auth0.com"
  type        = string
}

variable "auth0_client_id" {
  type      = string
  sensitive = true
}

variable "auth0_client_secret" {
  type      = string
  sensitive = true
}

# Database
variable "database_url" {
  description = "PostgreSQL connection string (e.g. from Neon or Supabase)"
  type        = string
  sensitive   = true
}

# Email
variable "resend_api_key" {
  type      = string
  sensitive = true
}

# Google Calendar
variable "google_client_id" {
  type      = string
  sensitive = true
}

variable "google_client_secret" {
  type      = string
  sensitive = true
}
