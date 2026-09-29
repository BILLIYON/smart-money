# Project Walkthroughs & Documentation

This directory contains walkthroughs and implementation documentation for major features and architectural changes in **Smart Money**.

## Index of Walkthroughs

- [PostgreSQL Auth Migration](file:///home/ec2-user/smart-money/walkthroughs/postgres_auth_migration.md) — Complete removal of Supabase Auth and migration to native PostgreSQL authentication with HTTP-only session cookies and bcrypt password hashing.
- [AWS SES SDK Integration](file:///home/ec2-user/smart-money/walkthroughs/aws_ses_sdk_setup.md) — Amazon SES SDK setup, email utility library, HTML email templates, password reset OTP flow, and AWS identity verification guide.
- [Partner Dashboard & Find a Partner — Backend Spec](file:///home/ec2-user/smart-money/walkthroughs/partner_dashboard_and_find_a_partner_spec.md) — **Not a retrospective** — this is a build spec for a feature that currently exists frontend-only. Screen-by-screen, button-by-button breakdown of `/partner`, `/partners`, the Partner Data Sharing consent control, and the Opportunities tab, with a suggested data model, auth approach, and build order for wiring it to a real backend.
