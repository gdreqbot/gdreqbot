import { User } from "../structs/user";

export const defaultValues: Session = {
    userId: "",
    userName: "",
    secret: "",
    issued: 0,
    expires: 0,
    active: false
}

export interface Session extends User {
    secret: string;
    issued: number;
    expires: number;
    active: boolean;
}
