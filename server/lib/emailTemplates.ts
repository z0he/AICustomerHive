/**
 * Professional HTML Email Templates
 */

export function createProfessionalEmailTemplate(content: string, logoUrl?: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333333;
            background-color: #f8f9fa;
        }
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        .email-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 30px;
            text-align: center;
        }
        .logo {
            max-width: 200px;
            height: auto;
            margin-bottom: 10px;
        }
        .company-name {
            color: #ffffff;
            font-size: 24px;
            font-weight: bold;
            margin: 0;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }
        .email-body {
            padding: 40px 30px;
        }
        .email-body h1 {
            color: #2c3e50;
            font-size: 28px;
            margin-bottom: 20px;
            font-weight: 600;
        }
        .email-body h2 {
            color: #34495e;
            font-size: 22px;
            margin-bottom: 15px;
            font-weight: 600;
        }
        .email-body h3 {
            color: #34495e;
            font-size: 18px;
            margin-bottom: 10px;
            font-weight: 600;
        }
        .email-body p {
            margin-bottom: 16px;
            font-size: 16px;
            line-height: 1.6;
        }
        .email-body ul, .email-body ol {
            margin-bottom: 16px;
            padding-left: 30px;
        }
        .email-body li {
            margin-bottom: 8px;
            font-size: 16px;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #ffffff !important;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            margin: 20px 0;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
            transition: all 0.3s ease;
        }
        .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
        }
        .email-footer {
            background-color: #f8f9fa;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e9ecef;
        }
        .email-footer p {
            margin: 0;
            font-size: 14px;
            color: #6c757d;
        }
        .social-links {
            margin: 20px 0;
        }
        .social-links a {
            display: inline-block;
            margin: 0 10px;
            color: #6c757d;
            text-decoration: none;
        }
        @media only screen and (max-width: 600px) {
            .email-container {
                width: 100% !important;
            }
            .email-header, .email-body, .email-footer {
                padding: 20px !important;
            }
            .email-body h1 {
                font-size: 24px !important;
            }
            .email-body h2 {
                font-size: 20px !important;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="email-header">
            ${logoUrl ? `<img src="${logoUrl}" alt="AICRM Logo" class="logo">` : `<img src="https://raw.githubusercontent.com/user-attachments/files/17793426/ai-crm-new-logo-15-05-2025-rectangle.png" alt="AICRM Logo" class="logo">`}
            <h1 class="company-name">AICRM</h1>
        </div>
        <div class="email-body">
            ${content}
        </div>
        <div class="email-footer">
            <p>© 2025 AICRM. All rights reserved.</p>
            <p>You received this email because you're a valued member of our community.</p>
            <div class="social-links">
                <a href="#" style="color: #6c757d;">Unsubscribe</a> |
                <a href="#" style="color: #6c757d;">Update Preferences</a>
            </div>
        </div>
    </div>
</body>
</html>
  `.trim();
}

export function createMinimalEmailTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email</title>
    <style>
        body {
            margin: 0;
            padding: 20px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333333;
            background-color: #ffffff;
        }
        .email-container {
            max-width: 600px;
            margin: 0 auto;
        }
        h1, h2, h3 { color: #2c3e50; }
        p { margin-bottom: 16px; }
        a { color: #667eea; }
        ul, ol { padding-left: 30px; }
        li { margin-bottom: 8px; }
    </style>
</head>
<body>
    <div class="email-container">
        ${content}
    </div>
</body>
</html>
  `.trim();
}