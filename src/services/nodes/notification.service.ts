import {inject} from "@loopback/core";
import {repository} from '@loopback/repository';
import {EmailManagerBindings} from "../../keys";
import {NodeOutputRepository} from '../../repositories';
import SITE_SETTINGS from "../../utils/config";
import {EmailManager} from "../email.service";
import {VariableService} from './variable.service';

interface EmailComponent {
  notificationSource: 'email';
  to: string[];
  subject: string;
  body: string;
}

export class NotificationService {
  constructor(
    @inject(EmailManagerBindings.SEND_MAIL)
    public emailManager: EmailManager,
    @repository(NodeOutputRepository)
    public nodeOutputRepository: NodeOutputRepository,
    @inject('services.VariableService')
    private variableService: VariableService,
  ) { }

  async notification(data: any, previousOutputs: any[], workflowInstanceData: any, outputDataId: string) {
    try {
      const component = data?.component ?? null;

      if (component?.notificationSource === 'email') {
        // ✅ Resolve all variables before sending email
        const resolvedComponent = await this.resolveEmailVariables(component, previousOutputs);

        const result = await this.notificationSourceEmail(resolvedComponent);
        await this.nodeOutputRepository.create({
          workflowOutputsId: outputDataId,
          status: 1,
          nodeId: data.id,
          output: result,
        });

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
        error: error.message || error,
      });
      throw new Error(`Notification failed: ${error.message}`);
    }
  }

  /** ✅ Replace {{nodeId.variableName}} placeholders with actual values */
  private async resolveEmailVariables(component: EmailComponent, previousOutputs: any[]) {
    const resolved = {...component};

    // Regex to detect variables like {{2.email}}
    const variablePattern = /{{(.*?)}}/g;

    // Helper function to resolve variables in a string
    const resolveString = async (text: string): Promise<string> => {
      if (!text) return text;

      const matches = text.match(variablePattern);
      if (!matches) return text;

      let resolvedText = text;
      for (const match of matches) {
        const value = await this.variableService.getVariableValue(match, previousOutputs);
        resolvedText = resolvedText.replace(match, value ?? '');
      }
      return resolvedText;
    };

    // Resolve "to" array (each entry could be a variable or text)
    if (Array.isArray(resolved.to)) {
      const newTo = [];
      for (const t of resolved.to) {
        if (typeof t === 'string' && variablePattern.test(t)) {
          const value = await this.variableService.getVariableValue(t, previousOutputs);
          if (value) newTo.push(value);
        } else {
          newTo.push(t);
        }
      }
      resolved.to = newTo;
    }

    // Resolve subject & body
    resolved.subject = await resolveString(resolved.subject);
    resolved.body = await resolveString(resolved.body);

    return resolved;
  }

  /** ✅ Send email after variables are resolved */
  async notificationSourceEmail(component: EmailComponent) {
    try {
      console.log('to', component.to);
      console.log('subject', component.subject);
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

  /** ✅ HTML email template builder */
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
