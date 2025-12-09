import { WorkerEntrypoint } from "cloudflare:workers";

export default class sendEmail extends WorkerEntrypoint {
    async fetch() {
        return new Response("Hello from Worker B");
    }

    async sendEmail(request) {
        let response;
        const RESEND_API_KEY = this.env.RESEND_API_KEY;
    	const FROM = this.env.EMAIL_FROM_ADDRESS;
   		const TO = this.env.EMAIL_TO_ADDRESS;
        
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

		const formData = await request.formData();

		// Get standard fields
		const name = (formData.get("name") || "").toString();
		const email = (formData.get("email") || "").toString();
		const tel = (formData.get("tel") || "").toString();
		const date = (formData.get("date") || "").toString();
		const textarea = (formData.get("textarea") || "").toString();

		// Get file field (actual File object, not via Object.fromEntries)
		const fileField = formData.get("file");

		console.log("Form Data received in Worker:", {
			name,
			email,
			tel,
			date,
			textarea,
			file: fileField ? "[File present]" : "[No file]",
		});

		// Build base email payload
		const emailPayload = {
			from: FROM,
			to: TO,
			reply_to: email,
			subject: `Site Christian Biede - Contact form message from ${name}`,
			html: `
				Name: ${name}<br/>
				Email: ${email}<br/>
				Telephone: ${tel}<br/>
				Date of Birth: ${date}<br/>
				Message: ${textarea}
			`,
		};

		 // If there is an attachment, convert it to base64 for Resend
		if (fileField && typeof fileField !== "string") {
			const file = fileField;
			console.log("Attachment file info:", file.name);

			const arrayBuffer = await file.arrayBuffer();
			const uint8 = new Uint8Array(arrayBuffer);

			let binary = "";
			for (let i = 0; i < uint8.length; i++) {
				binary += String.fromCharCode(uint8[i]);
			}
			const base64 = btoa(binary);

			emailPayload.attachments = [{
				filename: file.name,
				content: base64,
				contentType: file.type || "application/octet-stream",
			},];
		}

		const resendResponse = await fetch("https://api.resend.com/emails", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${RESEND_API_KEY}`,
			},
			body: JSON.stringify(emailPayload),
		});

		const resendData = await resendResponse.json();
		console.log("Resend response:", resendData);

		if (!resendResponse.ok) {
			console.error(
				"Error sending email:",
				resendResponse.status,
				resendResponse.statusText
			);

			return new Response(
				JSON.stringify({ok: false, error: "Failed to send email", details: resendData}),
				{
					status: 500,
					headers: responseHeaders,
				}
			);
		}

		return new Response(JSON.stringify({ ok: true, data: resendData }), {
			status: 200,
			headers: responseHeaders,
		});
    }
}