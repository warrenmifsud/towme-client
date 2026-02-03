// swift-tools-version: 5.9
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
    name: "TowingApp",
    platforms: [
        .macOS(.v14)
    ],
    products: [
        .executable(name: "TowingApp", targets: ["TowingApp"]),
    ],
    dependencies: [
        .package(url: "https://github.com/supabase/supabase-swift.git", from: "2.0.0"),
    ],
    targets: [
        .executableTarget(
            name: "TowingApp",
            dependencies: [
                .product(name: "Supabase", package: "supabase-swift"),
            ],
            path: "Sources/TowingApp"
        ),
    ]
)
