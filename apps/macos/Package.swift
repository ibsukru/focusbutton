// swift-tools-version:5.5
import PackageDescription

let package = Package(
    name: "FocusButton",
    platforms: [
        .macOS(.v11)
    ],
    products: [
        .executable(name: "FocusButton", targets: ["FocusButton"])
    ],
    dependencies: [],
    targets: [
        .executableTarget(
            name: "FocusButton",
            dependencies: [],
            resources: [.process("Resources")]
        )
    ]
)
