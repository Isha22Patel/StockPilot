output "vpc_id" {
  description = "StockPilot VPC ID"
  value       = aws_vpc.stockpilot.id
}

output "public_subnet_ids" {
  description = "StockPilot public subnet IDs"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "StockPilot private subnet IDs"
  value       = aws_subnet.private[*].id
}

output "eks_cluster_name" {
  description = "StockPilot EKS cluster name"
  value       = aws_eks_cluster.stockpilot.name
}

output "eks_cluster_endpoint" {
  description = "StockPilot EKS API endpoint"
  value       = aws_eks_cluster.stockpilot.endpoint
}