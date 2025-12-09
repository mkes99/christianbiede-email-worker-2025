import { WorkerEntrypoint } from "cloudflare:workers";

export default class sendEmail extends WorkerEntrypoint {
    async fetch() {
        return new Response("Hello from Worker B");
    }

    async sendEmail(request) {
        let response;
        const RESEND_API_KEY = this.env.RESEND_API_KEY;
        const responseHeaders = {
            "Access-Control-Allow-Origin": "*", 
            "Access-Control-Allow-Methods": "*", 
            "Access-Control-Allow-Headers": "*",
        };

        // handle CORS preflight requests
        if (request.method === "OPTIONS") {
            return new Response("ok", {
                headers: responseHeaders
            });
        }
        
        const formData = await request.json(); 
		console.log('Form Data received in Worker:', formData);

		const {date, email, file, tel, name, textarea} = formData;

		const body = JSON.stringify({
            from: `${this.env.EMAIL_FROM_ADDRESS}`,
            to: `${this.env.EMAIL_TO_ADDRESS}`,
            reply_to: `${email}`,
            subject: `Site Christian Biede - Contact form message from ${name}`,
            html: `
                Name: ${name}<br/>
                Email: ${email}<br/>
                Telephone: ${tel}<br/>
				Date of Birth: ${date}<br/>
                Message: ${textarea}
            `,
			attachments: [
				{
					content: attachment,
      				filename: `${file.name}`,
				},
			],
        });

        console.log('Sending email with the following content', body);

        response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`
            },
            body
        });

        const data = await response.json();
        console.log(data);

        // Check if the HTTP response status is successful (200-299 range)
        if (!response.ok) {
            console.error('Error sending email:', response.status, response.statusText);
            return new Response('Failed to send email', {
                status: 500,
                statusText: 'Internal Server Error',
                headers: responseHeaders
            });
        }

        console.log('Email sent successfully:', response.status, response.statusText);
        return new Response(response, {
            headers: responseHeaders,
            status: response.status,
            statusText: response.statusText
        });
    }
}