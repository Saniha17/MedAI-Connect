const testAPI = (req, res) => {

    const { name, email, password } = req.body;

    console.log(name);
    console.log(email);
    console.log(password);

    res.status(201).json({
        success: true,
        message: "User Registered Successfully",
        data: {
            name,
            email,
            password
        }
    });

};

module.exports = {
    testAPI
};