declare module "*.vue" {
    import type { DefineComponent } from "vue";
    const component: DefineComponent<{}, {}, any>;
    export default component;
}
declare module "*.png";
declare module "*.svg";
declare module "*.jpeg";
declare module "*.jpg";
declare module "*.gif";
declare module "*.txt";
declare module "*?raw" {
    const content: string;
    export default content;
}
declare module "*?inline" {
    const content: string;
    export default content;
}