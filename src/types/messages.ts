export interface messagesType {
  role: string;
  content: string;
}
export interface messageWSType {
  tenant: string;
  token: string;
  messages: messagesType[];
  model: string;
  uuid: string;
}
