output "project_id" {
  description = "Vercel project ID — add as VERCEL_PROJECT_ID secret in GitHub Actions"
  value       = vercel_project.app.id
}

output "project_url" {
  description = "Default Vercel deployment URL"
  value       = "https://${var.project_name}.vercel.app"
}
