import { prisma } from "@perp/shared-db";
import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { env } from "../utils/config";




export const signup = async(req: Request, res : Response) => {
//get username, password from req.body
const {username, password} = req.body;
//check if user exists in postgres
const existingUser = await prisma.user.findUnique({where : {username}});
if(existingUser) {
    res.status(400).json("user already exists");
    return;
}

//hash the password with bcrypt

const hashedPassword = await bcrypt.hash(password,10);

//create user in postgres
const addUser = await prisma.user.create({data : {username, password: hashedPassword}});
res.status(200).json("user scucessfully created");
}


export const signin = async(req : Request, res : Response) => {

    //get username and pass from req.body
    //check user exists
    //verify password

    const {username, password} = req.body;
    const existingUser = await prisma.user.findUnique({where : {username}})
    if(!existingUser) {
        res.status(400).json("User not found");
        return;
    }

    const decodedPass = await bcrypt.compare(password, existingUser.password);
    if(!decodedPass) {
        res.status(400).json("Password is wrong");
        return;
    }
    const token = jwt.sign({userId : existingUser.userId}, env.jwtSecret, {expiresIn : "24h"});
    res.status(200).json({token, user : {id: existingUser.userId, username}});

}

