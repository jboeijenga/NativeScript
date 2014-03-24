﻿import image_module = require("Image/image");

export class Image {
    public ios: any;

    constructor() {
        this.ios = null;
    }

    public loadFromResource(name: string): boolean {
        this.ios = UIKit.UIImage.imageNamed(name);
        return (this.ios != null);
    }

    public loadFromFile(path: string): boolean {
        this.ios = UIKit.UIImage.imageWithContentsOfFile(path);
        return (this.ios != null);
    }

    public loadFromData(data: any): boolean {
        this.ios = UIKit.UIImage.imageWithData(data);
        return (this.ios != null);
    }

    public loadFromBitmap(source: any): boolean {
        this.ios = source;
        return (this.ios != null);
    }

    public saveToFile(path: string, format: image_module.ImageType, quality?: number): boolean {
        if (null == this.ios) {
            return false;
        }
        var res = false;
        var data = null;
        switch (format) {
            case image_module.ImageType.JPEG:
                data = UIKit.UIImageJPEGRepresentation(this.ios, ('undefined' == typeof quality) ? 1.0 : quality);
                break;
            case image_module.ImageType.PNG:
                data = UIKit.UIImagePNGRepresentation(this.ios);
                break;
        }
        if (null != data) {
            res = data.writeToFileAtomically(path, true);
        }
        return res;
    }

    public getHeight(): number {
        return (this.ios) ? this.ios.size().height : NaN;
    }

    public getWidth(): number {
        return (this.ios) ? this.ios.size().width : NaN;
    }
}