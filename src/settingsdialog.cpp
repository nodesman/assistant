#include "settingsdialog.h"

#include <QtWidgets> // Include headers for widgets used

SettingsDialog::SettingsDialog(QWidget *parent)
    : QDialog(parent)
{
    setupUi();
    createCategories();

    // Connect signals after setup
    connect(m_categoriesListWidget, &QListWidget::currentItemChanged,
            this, &SettingsDialog::changePage);
    connect(m_searchLineEdit, &QLineEdit::textChanged,
            this, &SettingsDialog::filterCategories);

    // Connect standard buttons
    connect(m_buttonBox, &QDialogButtonBox::accepted, this, &QDialog::accept); // OK
    connect(m_buttonBox, &QDialogButtonBox::rejected, this, &QDialog::reject); // Cancel
    // Connect Apply button if it exists:
    // QPushButton *applyButton = m_buttonBox->button(QDialogButtonBox::Apply);
    // if(applyButton) connect(applyButton, &QPushButton::clicked, this, &SettingsDialog::applySettings);

    setWindowTitle(tr("Preferences"));
    resize(650, 450); // Set a reasonable default size
}

SettingsDialog::~SettingsDialog()
{
    // Widgets are owned by the dialog (or layout), Qt handles cleanup
}

void SettingsDialog::setupUi() {
    // Main layout structure
    QVBoxLayout *mainLayout = new QVBoxLayout(this); // Overall vertical layout

    // Search bar at the top
    m_searchLineEdit = new QLineEdit(this);
    m_searchLineEdit->setPlaceholderText(tr("Search settings..."));
    mainLayout->addWidget(m_searchLineEdit);

    // Horizontal layout for list and pages
    QHBoxLayout *contentLayout = new QHBoxLayout();
    mainLayout->addLayout(contentLayout, 1); // Make content area expand

    // Left side: Categories List
    m_categoriesListWidget = new QListWidget(this);
    m_categoriesListWidget->setViewMode(QListView::IconMode); // Optional: Use icon mode
    m_categoriesListWidget->setIconSize(QSize(32, 32)); // Adjust icon size if using icon mode
    m_categoriesListWidget->setMovement(QListView::Static); // Prevent dragging items
    m_categoriesListWidget->setMaximumWidth(150); // Set max width for the list
    m_categoriesListWidget->setSpacing(5); // Spacing between items
    contentLayout->addWidget(m_categoriesListWidget);

    // Right side: Stacked widget for pages
    m_pagesStackedWidget = new QStackedWidget(this);
    contentLayout->addWidget(m_pagesStackedWidget, 1); // Make stack expand

    // Bottom button box
    m_buttonBox = new QDialogButtonBox(QDialogButtonBox::Ok | QDialogButtonBox::Cancel | QDialogButtonBox::Apply, this); // Add Apply button
    mainLayout->addWidget(m_buttonBox);

    setLayout(mainLayout);
}

void SettingsDialog::createCategories() {
    // Add categories to the list and corresponding pages to the stack
    // The order must match!

    QListWidgetItem *generalButton = new QListWidgetItem(m_categoriesListWidget);
    generalButton->setIcon(QIcon::fromTheme("preferences-system", QIcon(":/icons/general.png"))); // Use themed or resource icon
    generalButton->setText(tr("General"));
    generalButton->setTextAlignment(Qt::AlignHCenter);
    generalButton->setFlags(Qt::ItemIsSelectable | Qt::ItemIsEnabled);
    m_pagesStackedWidget->addWidget(createGeneralPage()); // Index 0

    QListWidgetItem *apiKeysButton = new QListWidgetItem(m_categoriesListWidget);
    apiKeysButton->setIcon(QIcon::fromTheme("security-high", QIcon(":/icons/apikeys.png")));
    apiKeysButton->setText(tr("API Keys"));
    apiKeysButton->setTextAlignment(Qt::AlignHCenter);
    apiKeysButton->setFlags(Qt::ItemIsSelectable | Qt::ItemIsEnabled);
    m_pagesStackedWidget->addWidget(createApiKeysPage()); // Index 1

    QListWidgetItem *appearanceButton = new QListWidgetItem(m_categoriesListWidget);
    appearanceButton->setIcon(QIcon::fromTheme("preferences-desktop-theme", QIcon(":/icons/appearance.png")));
    appearanceButton->setText(tr("Appearance"));
    appearanceButton->setTextAlignment(Qt::AlignHCenter);
    appearanceButton->setFlags(Qt::ItemIsSelectable | Qt::ItemIsEnabled);
    m_pagesStackedWidget->addWidget(createAppearancePage()); // Index 2

    QListWidgetItem *updatesButton = new QListWidgetItem(m_categoriesListWidget);
    updatesButton->setIcon(QIcon::fromTheme("system-software-update", QIcon(":/icons/updates.png")));
    updatesButton->setText(tr("Updates"));
    updatesButton->setTextAlignment(Qt::AlignHCenter);
    updatesButton->setFlags(Qt::ItemIsSelectable | Qt::ItemIsEnabled);
    m_pagesStackedWidget->addWidget(createUpdatesPage()); // Index 3

    // Select the first item initially
    m_categoriesListWidget->setCurrentRow(0);
}

// --- Placeholder Page Creation ---
// Replace these with actual QWidget subclasses containing settings controls later
QWidget* SettingsDialog::createGeneralPage() {
    QWidget *widget = new QWidget;
    QVBoxLayout *layout = new QVBoxLayout(widget);
    layout->addWidget(new QLabel(tr("<h2>General Settings</h2><p>Placeholder for general application settings.</p>")));
    layout->addStretch(1);
    widget->setLayout(layout);
    return widget;
}

QWidget* SettingsDialog::createApiKeysPage() {
    QWidget *widget = new QWidget;
    QVBoxLayout *layout = new QVBoxLayout(widget);
    layout->addWidget(new QLabel(tr("<h2>API Key Management</h2><p>Placeholder for adding/editing/removing API keys.</p>")));
    // Example: Add a placeholder table
    QTableWidget* table = new QTableWidget(0, 2);
    table->setHorizontalHeaderLabels({"Provider", "Key"});
    layout->addWidget(table);
    layout->addStretch(1);
    widget->setLayout(layout);
    return widget;
}

QWidget* SettingsDialog::createAppearancePage() {
    QWidget *widget = new QWidget;
    QVBoxLayout *layout = new QVBoxLayout(widget);
    layout->addWidget(new QLabel(tr("<h2>Appearance Settings</h2>")));
    layout->addWidget(new QCheckBox(tr("Enable Dark Mode")));
    layout->addStretch(1);
    widget->setLayout(layout);
    return widget;
}

QWidget* SettingsDialog::createUpdatesPage() {
     QWidget *widget = new QWidget;
    QVBoxLayout *layout = new QVBoxLayout(widget);
    layout->addWidget(new QLabel(tr("<h2>Update Settings</h2>")));
    layout->addWidget(new QCheckBox(tr("Check for updates automatically")));
    layout->addWidget(new QPushButton(tr("Check Now")));
    layout->addStretch(1);
    widget->setLayout(layout);
    return widget;
}
// --- End Placeholder Page Creation ---

void SettingsDialog::changePage(QListWidgetItem *current, QListWidgetItem *previous)
{
    if (!current)
        current = previous; // Don't change page if nothing is selected (e.g., during filtering)

    if (current) {
        m_pagesStackedWidget->setCurrentIndex(m_categoriesListWidget->row(current));
    }
}

void SettingsDialog::filterCategories(const QString &text) {
    for (int i = 0; i < m_categoriesListWidget->count(); ++i) {
        QListWidgetItem *item = m_categoriesListWidget->item(i);
        // Simple case-insensitive contains check
        bool match = item->text().contains(text, Qt::CaseInsensitive);
        item->setHidden(!match);
    }
    // Optional: If the current item is now hidden, select the first visible one?
    if (m_categoriesListWidget->currentItem() && m_categoriesListWidget->currentItem()->isHidden()) {
        QListWidgetItem *firstVisible = nullptr;
        for (int i = 0; i < m_categoriesListWidget->count(); ++i) {
            if (!m_categoriesListWidget->item(i)->isHidden()) {
                firstVisible = m_categoriesListWidget->item(i);
                break;
            }
        }
        m_categoriesListWidget->setCurrentItem(firstVisible); // Might trigger changePage
    } else if (!m_categoriesListWidget->currentItem() && !text.isEmpty()) {
         // If nothing selected and filtering, try selecting the first visible
          QListWidgetItem *firstVisible = nullptr;
          for (int i = 0; i < m_categoriesListWidget->count(); ++i) {
            if (!m_categoriesListWidget->item(i)->isHidden()) {
                firstVisible = m_categoriesListWidget->item(i);
                break;
            }
        }
        m_categoriesListWidget->setCurrentItem(firstVisible);
    }
}

// void SettingsDialog::applySettings() {
//    qDebug() << "Apply button clicked - Save settings here without closing.";
//    // TODO: Iterate through pages and save their current state
// }