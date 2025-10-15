import {inject} from "@loopback/core";
import {repository} from '@loopback/repository';
import {EmailManagerBindings} from "../../keys";
import {NodeOutputRepository} from '../../repositories';
import SITE_SETTINGS from "../../utils/config";
import {EmailManager} from "../email.service";

interface EmailComponent {
  notificationSource: 'email';
  to: string;
  subject: string;
  body: string;
}

export class NotificationService {
  constructor(
    @inject(EmailManagerBindings.SEND_MAIL)
    public emailManager: EmailManager,
    @repository(NodeOutputRepository)
    public nodeOutputRepository: NodeOutputRepository,
  ) { }

  async notification(data: any, previousOutputs: any[], workflowInstanceData: any, outputDataId: string) {
    try {
      const component = data?.component ?? null;

      if (component?.notificationSource === 'email') {
        const result = await this.notificationSourceEmail(component);
        await this.nodeOutputRepository.create({
          workflowOutputsId: outputDataId,
          status: 1,
          nodeId: data.id,
          output: result
        })
        return {
          status: "success",
          timestamp: new Date().toISOString(),
          data: result,
        };
      }

      return {
        status: "success",
        timestamp: new Date().toISOString(),
        input: data,
      };
    } catch (error: any) {
      console.error("NotificationService.notification error:", error);
      await this.nodeOutputRepository.create({
        workflowOutputsId: outputDataId,
        status: 0,
        nodeId: data.id,
        error: error
      })
      throw new Error(`Notification failed: ${error.message}`);
    }
  }

  async notificationSourceEmail(component: EmailComponent) {
    try {
      if (component?.to?.length > 0) {
        for (const receiverEmail of component.to) {
          const mailOptions = {
            from: SITE_SETTINGS.fromMail,
            to: receiverEmail,
            subject: component.subject,
            html: this.buildEmailTemplate(component.body),
          };
          await this.emailManager.sendMail(mailOptions);
        }
      }
      return {success: true};
    } catch (error: any) {
      console.error("NotificationService.notificationSourceEmail error:", error);
      throw new Error(`Email notification failed: ${error.message}`);
    }
  }

  private buildEmailTemplate(body: string): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; }
    .content { padding: 20px; background: #fff; border-radius: 8px; }
  </style>
</head>
<body>
  <div class="content">
    ${body}
  </div>
</body>
</html>`;
  }
}
