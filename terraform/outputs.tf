output "project_id" {
  description = "Vercel project ID — add as VERCEL_PROJECT_ID secret in GitHub Actions"
  value       = vercel_project.app.id
}

output "project_url" {
  description = "Default Vercel deployment URL"
  value       = "https://${var.project_name}.vercel.app"
}

output "custom_domain_url" {
  description = "Custom domain URL for production"
  value       = "https://${vercel_project_domain.custom.domain}"
}
