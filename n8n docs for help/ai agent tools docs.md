# **Tools AI Agent node[\#](https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent/tools-agent/#tools-ai-agent-node)**

The Tools Agent uses external [tools](https://docs.n8n.io/glossary/#ai-tool) and APIs to perform actions and retrieve information. It can understand the capabilities of different tools and determine which tool to use depending on the task. This agent helps integrate LLMs with various external services and databases.

This agent has an enhanced ability to work with tools and can ensure a standard output format.

The Tools Agent implements [Langchain's tool calling](https://js.langchain.com/docs/concepts/tool_calling/) interface. This interface describes available tools and their schemas. The agent also has improved output parsing capabilities, as it passes the parser to the model as a formatting tool.

Refer to [AI Agent](https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent/) for more information on the AI Agent node itself.

You can use this agent with the [Chat Trigger](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-langchain.chattrigger/) node. Attach a memory sub-node so that users can have an ongoing conversation with multiple queries. Memory doesn't persist between sessions.

This agent supports the following chat models:

* [OpenAI Chat Model](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.lmchatopenai/)  
* [Groq Chat Model](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.lmchatgroq/)  
* [Mistral Cloud Chat Model](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.lmchatmistralcloud/)  
* [Anthropic Chat Model](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.lmchatanthropic/)  
* [Azure OpenAI Chat Model](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.lmchatazureopenai/)

**The Tools Agent can use the following tools...**

* [Call n8n Workflow](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolworkflow/)  
* [Code](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolcode/)  
* [HTTP Request](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolhttprequest/)  
* [Action Network](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.actionnetwork/)  
* [ActiveCampaign](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.activecampaign/)  
* [Affinity](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.affinity/)  
* [Agile CRM](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.agilecrm/)  
* [Airtable](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.airtable/)  
* [APITemplate.io](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.apitemplateio/)  
* [Asana](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.asana/)  
* [AWS Lambda](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.awslambda/)  
* [AWS S3](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.awss3/)  
* [AWS SES](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.awsses/)  
* [AWS Textract](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.awstextract/)  
* [AWS Transcribe](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.awstranscribe/)  
* [Baserow](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.baserow/)  
* [Bubble](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.bubble/)  
* [Calculator](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolcalculator/)  
* [ClickUp](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.clickup/)  
* [CoinGecko](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.coingecko/)  
* [Compression](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.compression/)  
* [Crypto](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.crypto/)  
* [DeepL](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.deepl/)  
* [DHL](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.dhl/)  
* [Discord](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.discord/)  
* [Dropbox](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.dropbox/)  
* [Elasticsearch](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.elasticsearch/)  
* [ERPNext](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.erpnext/)  
* [Facebook Graph API](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.facebookgraphapi/)  
* [FileMaker](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.filemaker/)  
* [Ghost](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.ghost/)  
* [Git](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.git/)  
* [GitHub](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.github/)  
* [GitLab](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.gitlab/)  
* [Gmail](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.gmail/)  
* [Google Analytics](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.googleanalytics/)  
* [Google BigQuery](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.googlebigquery/)  
* [Google Calendar](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.googlecalendar/)  
* [Google Chat](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.googlechat/)  
* [Google Cloud Firestore](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.googlecloudfirestore/)  
* [Google Cloud Realtime Database](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.googlecloudrealtimedatabase/)  
* [Google Contacts](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.googlecontacts/)  
* [Google Docs](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.googledocs/)  
* [Google Drive](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.googledrive/)  
* [Google Sheets](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.googlesheets/)  
* [Google Slides](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.googleslides/)  
* [Google Tasks](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.googletasks/)  
* [Google Translate](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.googletranslate/)  
* [Google Workspace Admin](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.gsuiteadmin/)  
* [Gotify](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.gotify/)  
* [Grafana](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.grafana/)  
* [GraphQL](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.graphql/)  
* [Hacker News](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.hackernews/)  
* [Home Assistant](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.homeassistant/)  
* [HubSpot](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.hubspot/)  
* [Jenkins](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.jenkins/)  
* [Jira Software](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.jira/)  
* [JWT](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.jwt/)  
* [Kafka](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.kafka/)  
* [LDAP](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.ldap/)  
* [Line](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.line/)  
* [LinkedIn](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.linkedin/)  
* [Mailcheck](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.mailcheck/)  
* [Mailgun](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.mailgun/)  
* [Mattermost](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.mattermost/)  
* [Mautic](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.mautic/)  
* [Medium](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.medium/)  
* [Microsoft Excel 365](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.microsoftexcel/)  
* [Microsoft OneDrive](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.microsoftonedrive/)  
* [Microsoft Outlook](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.microsoftoutlook/)  
* [Microsoft SQL](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.microsoftsql/)  
* [Microsoft Teams](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.microsoftteams/)  
* [Microsoft To Do](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.microsofttodo/)  
* [Monday.com](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.mondaycom/)  
* [MongoDB](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.mongodb/)  
* [MQTT](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.mqtt/)  
* [MySQL](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.mysql/)  
* [NASA](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.nasa/)  
* [Nextcloud](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.nextcloud/)  
* [NocoDB](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.nocodb/)  
* [Notion](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.notion/)  
* [Odoo](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.odoo/)  
* [OpenWeatherMap](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.openweathermap/)  
* [Pipedrive](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.pipedrive/)  
* [Postgres](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.postgres/)  
* [Pushover](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.pushover/)  
* [QuickBooks Online](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.quickbooks/)  
* [QuickChart](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.quickchart/)  
* [RabbitMQ](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.rabbitmq/)  
* [Reddit](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.reddit/)  
* [Redis](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.redis/)  
* [RocketChat](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.rocketchat/)  
* [S3](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.s3/)  
* [Salesforce](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.salesforce/)  
* [Send Email](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.sendemail/)  
* [SendGrid](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.sendgrid/)  
* [SerpApi (Google Search)](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolserpapi/)  
* [Shopify](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.shopify/)  
* [Slack](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.slack/)  
* [Spotify](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.spotify/)  
* [Stripe](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.stripe/)  
* [Supabase](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.supabase/)  
* [Telegram](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.telegram/)  
* [Todoist](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.todoist/)  
* [TOTP](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.totp/)  
* [Trello](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.trello/)  
* [Twilio](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.twilio/)  
* [urlscan.io](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.urlscanio/)  
* [Vector Store](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolvectorstore/)  
* [Webflow](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.webflow/)  
* [Wikipedia](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolwikipedia/)  
* [Wolfram|Alpha](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolwolframalpha/)  
* [WooCommerce](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.woocommerce/)  
* [Wordpress](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.wordpress/)  
* [X (Formerly Twitter)](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.twitter/)  
* [YouTube](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.youtube/)  
* [Zendesk](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.zendesk/)  
* [Zoho CRM](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.zohocrm/)  
* [Zoom](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.zoom/)

## **Node parameters[\#](https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent/tools-agent/#node-parameters)**

Configure the Tools Agent using the following parameters.

### **Prompt[\#](https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent/tools-agent/#prompt)**

Select how you want the node to construct the prompt (also known as the user's query or input from the chat).

Choose from:

* **Take from previous node automatically**: If you select this option, the node expects an input from a previous node called chatInput.  
* **Define below**: If you select this option, provide either static text or an expression for dynamic content to serve as the prompt in the **Prompt (User Message)** field.

### **Require Specific Output Format[\#](https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent/tools-agent/#require-specific-output-format)**

This parameter controls whether you want the node to require a specific output format. When turned on, n8n prompts you to connect one of these output parsers to the node:

* [Auto-fixing Output Parser](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.outputparserautofixing/)  
* [Item List Output Parser](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.outputparseritemlist/)  
* [Structured Output Parser](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.outputparserstructured/)

## **Node options[\#](https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent/tools-agent/#node-options)**

Refine the Tools Agent node's behavior using these options:

### **System Message[\#](https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent/tools-agent/#system-message)**

If you'd like to send a message to the agent before the conversation starts, enter the message you'd like to send.

Use this option to guide the agent's decision-making.

### **Max Iterations[\#](https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent/tools-agent/#max-iterations)**

Enter the number of times the model should run to try and generate a good answer from the user's prompt.

Defaults to 10.

### **Return Intermediate Steps[\#](https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent/tools-agent/#return-intermediate-steps)**

Select whether to include intermediate steps the agent took in the final output (turned on) or not (turned off).

This could be useful for further refining the agent's behavior based on the steps it took.

### **Automatically Passthrough Binary Images[\#](https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent/tools-agent/#automatically-passthrough-binary-images)**

Use this option to control whether binary images should be automatically passed through to the agent as image type messages (turned on) or not (turned off).

### **Enable Streaming[\#](https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent/tools-agent/#enable-streaming)**

When enabled, the AI Agent sends data back to the user in real-time as it generates the answer. This is useful for long-running generations. This is enabled by default.

**Streaming requirements**

For streaming to work, your workflow must use a trigger that supports streaming responses, such as the [Chat Trigger](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-langchain.chattrigger/) or [Webhook](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/) node with **Response Mode** set to **Streaming**.

## **Templates and examples[\#](https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent/tools-agent/#templates-and-examples)**

Refer to the main AI Agent node's [Templates and examples](https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent/#templates-and-examples) section.

## **Dynamic parameters for tools with $fromAI()[\#](https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent/tools-agent/#dynamic-parameters-for-tools-with-fromai)**

To learn how to dynamically populate parameters for app node tools, refer to [Let AI specify tool parameters with $fromAI()](https://docs.n8n.io/advanced-ai/examples/using-the-fromai-function/).

## **Common issues[\#](https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent/tools-agent/#common-issues)**

For common questions or issues and suggested solutions, refer to [Common issues](https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent/common-issues/).

