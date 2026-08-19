# Maison Élégance — Salon Booking Platform

A full-stack salon management and booking platform built for a real client, designed to run a salon's day-to-day operations rather than just present a marketing page.

**Live site:** https://maison-elegance-frontend.mustufaaijaz1234.workers.dev/

## What it does

- Client-facing booking flow for salon services and stylists
- Admin dashboard for managing bookings, stylists, services, and clients
- Automated booking-confirmation emails
- Backend deployed on Azure App Service, connected to Azure SQL

## Tech Stack

- **Frontend:** React, Tailwind CSS — deployed on Cloudflare Pages/Workers
- **Backend:** ASP.NET Core Web API (C#)
- **Database:** SQL Server (Azure SQL)
- **Email:** MailKit + Gmail SMTP for booking confirmations

## Architecture

The frontend is a static React/Tailwind app that talks to a separately deployed ASP.NET Core Web API. The API handles all booking logic, stylist/service management, and persists data to SQL Server. Deployed entirely on free-tier infrastructure (Azure for Students + Cloudflare Pages).

## Status

Backend and admin dashboard are live and functional. Actively maintained.

---
*Built by [Mustufa Aijaz](https://github.com/Mustufa842) — [TechLearning Web Studio](#)*
