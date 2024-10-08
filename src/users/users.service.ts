import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CreateUserDto, RegisterUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { InjectModel } from "@nestjs/mongoose";
import { User, UserDocument } from "./schemas/user.schema";
import mongoose from "mongoose";
import { genSaltSync, hashSync, compareSync } from "bcryptjs";
import { SoftDeleteModel } from "soft-delete-plugin-mongoose";
import { IUser } from "./users.interface";

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: SoftDeleteModel<UserDocument>
  ) {}

  getHashPassword = (password: string) => {
    const salt = genSaltSync(10);
    const hash = hashSync(password, salt);
    return hash;
  };

  isValidPassword(password: string, hash: string) {
    return compareSync(password, hash);
  }

  async register(user: RegisterUserDto) {
    const { name, email, password, age, gender, address } = user;

    const isExist = await this.userModel.findOne({ email });
    if (isExist) {
      throw new BadRequestException(`Email: ${email} already exists`);
    }

    const hashPassword = this.getHashPassword(password);
    let newRegister = await this.userModel.create({
      name,
      email,
      password: hashPassword,
      age,
      gender,
      address,
      role: "USER",
    });

    return newRegister;
  }

  // Find user by Id
  findUserById(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id))
      throw new NotFoundException("User not found");

    return this.userModel.findOne({ _id: id }).select("-password");
  }

  async update(updateUserDto: UpdateUserDto, user: IUser) {
    let result = await this.userModel.updateOne(
      { _id: updateUserDto._id },
      {
        ...updateUserDto,
        updatedBy: {
          _id: user._id,
          email: user.email,
        },
      }
    );
    return {
      result,
      updatedBy: {
        _id: user._id,
        email: user.email,
      },
    };
  }

  // Delete user
  async remove(id: string, user: IUser) {
    if (!mongoose.Types.ObjectId.isValid(id))
      throw new NotFoundException("Not found id user");

    await this.userModel.updateOne(
      { _id: id },
      {
        deletedBy: {
          _id: user._id,
          email: user.email,
        },
      }
    );
    let result = await this.userModel.softDelete({ _id: id });
    return {
      result,
      deletedBy: {
        _id: user._id,
        email: user.email,
      },
    };
  }

  findOneByUserEmail(userEmail: string) {
    return this.userModel.findOne({ email: userEmail });
  }
}
